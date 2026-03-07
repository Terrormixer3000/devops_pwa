import webpush from "web-push";

type WebPushStatus = { ok: true } | { ok: false; error: string };

let cachedStatus: WebPushStatus | null = null;

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

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

export function getWebPushClient(): typeof webpush {
  const status = ensureWebPushConfigured();
  if (!status.ok) {
    throw new Error(status.error);
  }
  return webpush;
}

export function getWebPushErrorStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export function isExpiredSubscriptionError(error: unknown): boolean {
  const statusCode = getWebPushErrorStatusCode(error);
  return statusCode === 404 || statusCode === 410;
}
