import { NextRequest, NextResponse } from "next/server";

/**
 * API-Route fuer Push-Abonnement-Verwaltung.
 * POST: Speichert eine neue PushSubscription inkl. Webhook-Token.
 * DELETE: Entfernt eine bestehende PushSubscription anhand des Endpoints.
 */
import {
  getSubscriptionByEndpoint,
  matchesSubscriptionToken,
  upsertSubscription,
  removeSubscription,
} from "@/lib/server/subscriptionDb";
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const subscription = parseSubscription(body);
  const org = normalizeText((body as { org?: string })?.org);
  const project = normalizeText((body as { project?: string })?.project);
  const azureUserId = normalizeText((body as { azureUserId?: string })?.azureUserId);
  const displayName = normalizeText((body as { displayName?: string })?.displayName);
  const token = normalizeText((body as { token?: string })?.token);
  const existingRecord = subscription ? getSubscriptionByEndpoint(subscription.endpoint) : null;
  const eventPreferences = normalizePushEventPreferences(
    (body as { eventPreferences?: Partial<PushEventPreferences> })?.eventPreferences
      ?? existingRecord?.eventPreferences
  );

  if (!subscription) {
    return NextResponse.json({ error: "Incomplete subscription data" }, { status: 400 });
  }
  if (!isSecureSubscriptionEndpoint(subscription.endpoint)) {
    return NextResponse.json({ error: "Invalid subscription endpoint" }, { status: 400 });
  }

  if (!org || !project || !azureUserId) {
    return NextResponse.json(
      { error: "org, project, and azureUserId are required" },
      { status: 400 }
    );
  }

  if (existingRecord) {
    if (!matchesSubscriptionToken(existingRecord, token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (
      existingRecord.org !== org.toLowerCase() ||
      existingRecord.project !== project.toLowerCase() ||
      existingRecord.azureUserId !== azureUserId.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "org, project, and azureUserId cannot be changed for an existing subscription" },
        { status: 403 }
      );
    }
  }

  const webhookToken = existingRecord?.webhookToken ?? generateWebhookToken();

  const record: PushSubscriptionRecord = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    org: existingRecord?.org ?? org,
    project: existingRecord?.project ?? project,
    azureUserId: existingRecord?.azureUserId ?? azureUserId,
    displayName: displayName || "Unknown user",
    createdAt: new Date().toISOString(),
    eventPreferences,
    webhookToken,
  };

  try {
    upsertSubscription(record);
  } catch (err) {
    console.error("[push/subscribe] Failed to store subscription:", err);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, webhookToken }, { status: 201 });
}

/**
 * DELETE /api/push/subscribe
 * Loescht eine PushSubscription anhand ihres Endpoints.
 *
 * Body: { endpoint: string, token: string }
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const endpoint = normalizeText((body as { endpoint?: string })?.endpoint);
  const token = normalizeText((body as { token?: string })?.token);

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 401 });
  }

  const existingRecord = getSubscriptionByEndpoint(endpoint);
  if (!existingRecord || !matchesSubscriptionToken(existingRecord, token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    removeSubscription(endpoint);
  } catch (err) {
    console.error("[push/subscribe] Failed to delete subscription:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
