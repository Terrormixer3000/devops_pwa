import { NextRequest, NextResponse } from "next/server";

/**
 * API-Route fuer Push-Abonnement-Verwaltung.
 * POST: Speichert eine neue PushSubscription inkl. Webhook-Token.
 * DELETE: Entfernt eine bestehende PushSubscription anhand des Endpoints.
 */
import { getSubscriptionByEndpoint, upsertSubscription, removeSubscription } from "@/lib/server/subscriptionDb";
import { generateWebhookToken, isSecureSubscriptionEndpoint, normalizeText } from "@/lib/server/pushRouteUtils";
import type { PushEventPreferences, PushSubscriptionRecord } from "@/types";
import { normalizePushEventPreferences } from "@/lib/utils/pushEventPreferences";

export const runtime = "nodejs";

/** Extrahiert und validiert die erforderlichen Push-Felder aus dem Request-Body. */
function parseSubscription(body: unknown): {
  endpoint: string;
  p256dh: string;
  auth: string;
} | null {
  if (typeof body !== "object" || body === null) return null;

  const subscription = (body as { subscription?: PushSubscriptionJSON }).subscription;
  const endpoint = normalizeText(subscription?.endpoint);
  const p256dh = normalizeText(subscription?.keys?.p256dh);
  const auth = normalizeText(subscription?.keys?.auth);

  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

/**
 * POST /api/push/subscribe
 * Speichert eine neue PushSubscription in der lokalen Subscription-DB.
 *
 * Body: {
 *   subscription: PushSubscriptionJSON,
 *   org: string,
 *   project: string,
 *   azureUserId: string,
 *   displayName: string,
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiger Request-Body" }, { status: 400 });
  }

  const subscription = parseSubscription(body);
  const org = normalizeText((body as { org?: string })?.org);
  const project = normalizeText((body as { project?: string })?.project);
  const azureUserId = normalizeText((body as { azureUserId?: string })?.azureUserId);
  const displayName = normalizeText((body as { displayName?: string })?.displayName);
  const existingRecord = subscription ? getSubscriptionByEndpoint(subscription.endpoint) : null;
  const eventPreferences = normalizePushEventPreferences(
    (body as { eventPreferences?: Partial<PushEventPreferences> })?.eventPreferences
      ?? existingRecord?.eventPreferences
  );

  if (!subscription) {
    return NextResponse.json({ error: "Unvollstaendige Subscription-Daten" }, { status: 400 });
  }
  if (!isSecureSubscriptionEndpoint(subscription.endpoint)) {
    return NextResponse.json({ error: "Ungueltiger Subscription-Endpoint" }, { status: 400 });
  }

  if (!org || !project || !azureUserId) {
    return NextResponse.json(
      { error: "org, project und azureUserId sind Pflichtfelder" },
      { status: 400 }
    );
  }

  const webhookToken = existingRecord?.webhookToken ?? generateWebhookToken();

  const record: PushSubscriptionRecord = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    org,
    project,
    azureUserId,
    displayName: displayName || "Unbekannter Benutzer",
    createdAt: new Date().toISOString(),
    eventPreferences,
    webhookToken,
  };

  try {
    upsertSubscription(record);
  } catch (err) {
    console.error("[push/subscribe] Fehler beim Speichern der Subscription:", err);
    return NextResponse.json({ error: "Speicherfehler" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, webhookToken }, { status: 201 });
}

/**
 * DELETE /api/push/subscribe
 * Loescht eine PushSubscription anhand ihres Endpoints.
 *
 * Body: { endpoint: string }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiger Request-Body" }, { status: 400 });
  }

  const endpoint = normalizeText((body as { endpoint?: string })?.endpoint);

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint ist ein Pflichtfeld" }, { status: 400 });
  }

  try {
    removeSubscription(endpoint);
  } catch (err) {
    console.error("[push/subscribe] Fehler beim Loeschen der Subscription:", err);
    return NextResponse.json({ error: "Loeschfehler" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
