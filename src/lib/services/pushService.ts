/**
 * Browser-seitiger Web Push Service
 *
 * Kapselt die gesamte Logik fuer:
 * - Pruefen ob Web Push unterstuetzt wird
 * - Notification-Erlaubnis anfragen
 * - PushSubscription erstellen (VAPID)
 * - Subscription an den eigenen API-Server senden / loeschen
 */

/** Konvertiert einen Base64url-String in einen Uint8Array (benoetigt fuer VAPID Public Key) */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function isSameApplicationServerKey(
  subscription: PushSubscription,
  expectedKey: Uint8Array<ArrayBuffer>
): boolean {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;

  const current = new Uint8Array(currentKey);
  if (current.length !== expectedKey.length) return false;

  for (let i = 0; i < current.length; i++) {
    if (current[i] !== expectedKey[i]) return false;
  }
  return true;
}

async function readErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) return `HTTP ${response.status}`;

  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Text ist kein JSON; unveraendert zurueckgeben.
  }
  return raw;
}

async function waitForServiceWorkerRegistration(timeoutMs = 4000): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;

  // Fallback: SW aktiv registrieren, falls Auto-Registration (next-pwa) noch nicht gegriffen hat.
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.error("[push] Service Worker Registrierung fehlgeschlagen:", error);
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error(
          "Kein aktiver Service Worker gefunden. Pruefe /sw.js im Browser, fuehre einen Hard-Reload aus und entferne alte Service-Worker-Registrierungen."
        )
      );
    }, timeoutMs);
  });

  return Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
}

export type PushPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Detaillierter Support-Status — erlaubt der UI, praezise Hinweise anzuzeigen
 * statt alles unter "Nicht unterstuetzt" zu buendeln.
 */
export type PushSupportStatus =
  /** Browser hat keine Push/SW-APIs (sehr alter Browser) */
  | "unsupported"
  /** Seite wird ueber HTTP ausgeliefert — Service Worker und Push erfordern HTTPS */
  | "needs-https"
  /** iOS Safari: PushManager fehlt weil nicht als installierte PWA gestartet */
  | "needs-pwa-install"
  /** Service Worker fehlt oder ist nicht aktiv */
  | "needs-service-worker"
  /** Alles vorhanden, Push kann genutzt werden */
  | "supported";

export const pushService = {
  /**
   * Gibt den detaillierten Support-Status zurueck.
   * Unterscheidet zwischen echtem Nicht-Support, fehlendem PWA-Install und Dev-Modus.
   */
  getSupportStatus(): PushSupportStatus {
    if (typeof window === "undefined") return "unsupported";

    const hasSwApi = "serviceWorker" in navigator;
    const hasNotification = "Notification" in window;
    const hasPushManager = "PushManager" in window;

    // Kein Service-Worker API → echter Browser-Nicht-Support
    if (!hasSwApi || !hasNotification) return "unsupported";

    // HTTPS-Pruefung: Service Worker und Push erfordern einen sicheren Kontext.
    // localhost ist als sicherer Kontext ausgenommen (fuer Desktop-Entwicklung).
    const isSecure = window.isSecureContext;
    const isLocalhost =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "[::1]";
    if (!isSecure && !isLocalhost) return "needs-https";

    // SW-API vorhanden, aber kein PushManager:
    // Auf iOS ist PushManager nur in der installierten PWA verfuegbar.
    // Wenn PushManager fehlt, ist meist kein aktiver/unterstuetzter SW-Kontext verfuegbar.
    if (!hasPushManager) {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIos) return "needs-pwa-install";
      return "needs-service-worker";
    }

    return "supported";
  },

  /**
   * Prueft ob der Browser Web Push grundsaetzlich unterstuetzt.
   * Auf iOS ist Web Push nur im installierten PWA-Modus verfuegbar (ab iOS 16.4).
   */
  isSupported(): boolean {
    return this.getSupportStatus() === "supported";
  },

  /** Gibt den aktuellen Notification-Erlaubnis-Status zurueck. */
  getPermissionState(): PushPermissionState {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission as PushPermissionState;
  },

  /**
   * Holt die aktive PushSubscription des Service Workers, falls vorhanden.
   * Gibt null zurueck wenn noch keine Subscription existiert.
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    const registration = await waitForServiceWorkerRegistration();
    return registration.pushManager.getSubscription();
  },

  /**
   * Fragt Notification-Erlaubnis an und erstellt eine neue PushSubscription.
   * Wirft einen Fehler wenn der User die Erlaubnis verweigert.
   */
  async subscribe(): Promise<PushSubscription> {
    if (!this.isSupported()) {
      throw new Error("Web Push wird von diesem Browser nicht unterstuetzt.");
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      throw new Error("Notification-Erlaubnis verweigert.");
    }

    const vapidPublicKey = normalizeText(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    if (!vapidPublicKey) {
      throw new Error("VAPID Public Key nicht konfiguriert (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
    }
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const registration = await waitForServiceWorkerRegistration();

    // Bestehende Subscription verwenden oder neue erstellen
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      if (isSameApplicationServerKey(existing, applicationServerKey)) {
        return existing;
      }
      await existing.unsubscribe();
    }

    return registration.pushManager.subscribe({
      userVisibleOnly: true, // Pflichtfeld: alle Push-Nachrichten muessen als Notification erscheinen
      applicationServerKey,
    });
  },

  /**
   * Sendet die PushSubscription an den eigenen API-Server, damit der Server
   * spaeter Web Push Nachrichten an diesen Browser senden kann.
   * Gibt den generierten Webhook-Token zurueck.
   */
  async registerSubscription(
    subscription: PushSubscription,
    org: string,
    project: string,
    azureUserId: string,
    displayName: string
  ): Promise<{ webhookToken: string }> {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        org: normalizeText(org),
        project: normalizeText(project),
        azureUserId: normalizeText(azureUserId),
        displayName: normalizeText(displayName),
      }),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(`Subscription-Registrierung fehlgeschlagen: ${message}`);
    }

    const data = (await response.json()) as { ok: boolean; webhookToken: string };
    return { webhookToken: data.webhookToken };
  },

  /**
   * Deaktiviert die PushSubscription im Browser und benachrichtigt den Server,
   * damit abgelaufene Subscriptions aus der DB entfernt werden.
   */
  async unsubscribe(): Promise<void> {
    const subscription = await this.getExistingSubscription();
    if (!subscription) return;
    const endpoint = normalizeText(subscription.endpoint);
    const errors: string[] = [];

    // Server und Browser beide aufraeumen; Fehler sammeln statt fruehzeitig abzubrechen.
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
        keepalive: true,
      });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        errors.push(`Server-Reset fehlgeschlagen: ${message}`);
      }
    } catch (err) {
      errors.push(`Server-Reset fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) {
        errors.push("Browser konnte die Subscription nicht entfernen.");
      }
    } catch (err) {
      errors.push(`Browser-Reset fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(" | "));
    }

    // Token nach erfolgreichem Deaktivieren aus dem lokalen Speicher entfernen
    this.clearStoredToken();
  },

  /** Liest den gespeicherten Webhook-Token aus dem lokalen Speicher. */
  getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("azdevops_push_token");
  },

  /** Speichert den Webhook-Token im lokalen Speicher. */
  storeToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("azdevops_push_token", token);
  },

  /** Entfernt den Webhook-Token aus dem lokalen Speicher. */
  clearStoredToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("azdevops_push_token");
  },
};
