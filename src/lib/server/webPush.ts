/**
 * Server-seitige Web-Push-Konfiguration.
 * Kapselt die VAPID-Konfiguration und stellt einen konfigurierten
 * web-push-Client bereit. Die Konfiguration wird gecacht um mehrfaches
 * Initialisieren bei Hot-Reloads zu vermeiden.
 */

import webpush from "web-push";

type WebPushStatus = { ok: true } | { ok: false; error: string };

let cachedStatus: WebPushStatus | null = null;

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * Konfiguriert web-push mit VAPID-Schluesseln (gecacht nach erstem Aufruf).
 * Gibt `{ ok: true }` zurueck wenn die Konfiguration erfolgreich war,
 * andernfalls `{ ok: false, error: "..." }`.
 */
export function ensureWebPushConfigured(): WebPushStatus {
  if (cachedStatus) return cachedStatus;

  const subject = readEnv("VAPID_SUBJECT") || "mailto:admin@example.com";
  const publicKey = readEnv("VAPID_PUBLIC_KEY");
  const privateKey = readEnv("VAPID_PRIVATE_KEY");

  if (!publicKey || !privateKey) {
    cachedStatus = {
      ok: false,
      error: "Web Push ist nicht konfiguriert. Bitte VAPID_PUBLIC_KEY und VAPID_PRIVATE_KEY setzen.",
    };
    return cachedStatus;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    cachedStatus = { ok: true };
    return cachedStatus;
  } catch (err) {
    cachedStatus = {
      ok: false,
      error: `Web Push Konfiguration fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
    };
    return cachedStatus;
  }
}

/**
 * Gibt den konfigurierten web-push-Client zurueck.
 * Wirft einen Fehler wenn VAPID-Schluessel nicht gesetzt sind.
 */
export function getWebPushClient(): typeof webpush {
  const status = ensureWebPushConfigured();
  if (!status.ok) {
    throw new Error(status.error);
  }
  return webpush;
}

/** Gibt den HTTP-Statuscode eines web-push-Fehlers zurueck (oder null). */
export function getWebPushErrorStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

/**
 * Prueft ob ein web-push-Fehler auf eine abgelaufene Subscription hinweist
 * (HTTP 404 oder 410 Gone). In diesen Faellen sollte die Subscription aus der DB entfernt werden.
 */
export function isExpiredSubscriptionError(error: unknown): boolean {
  const statusCode = getWebPushErrorStatusCode(error);
  return statusCode === 404 || statusCode === 410;
}
