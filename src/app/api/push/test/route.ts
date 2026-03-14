/**
 * POST /api/push/test
 *
 * Test-Endpunkt: Sendet eine Web Push Notification direkt an alle Subscriptions
 * einer Org/Projekt-Kombination fuer genau einen Azure DevOps User, ohne einen
 * echten Azure DevOps Service Hook zu brauchen.
 *
 * Body: {
 *   org: string
 *   project: string
 *   azureUserId: string
 *   eventType: "build.failed" | "build.succeeded" | "pr.reviewer" | "pr.comment" | "release.approval"
 * }
 *
 * Nur fuer Entwicklung und Tests gedacht. In Produktion kann dieser Endpunkt
 * durch eine Umgebungsvariable deaktiviert werden.
 */

import { NextRequest, NextResponse } from "next/server";
import { dedupeSubscriptionsByEndpoint, normalizeText } from "@/lib/server/pushRouteUtils";
import { getSubscriptionsForUsers, removeSubscription } from "@/lib/server/subscriptionDb";
import {
  ensureWebPushConfigured,
  getWebPushClient,
  getWebPushErrorStatusCode,
  isExpiredSubscriptionError,
} from "@/lib/server/webPush";
import type { PushEventType, WebhookNotificationPayload } from "@/types";

export const runtime = "nodejs";

type TestEventType = PushEventType;

const TEST_NOTIFICATIONS: Record<TestEventType, WebhookNotificationPayload> = {
  "build.failed": {
    title: "Build fehlgeschlagen",
    body: "CI Pipeline #42 ist fehlgeschlagen (branch: feature/push-test)",
    tag: "build-test-failed",
    url: "/pipelines",
  },
  "build.succeeded": {
    title: "Build erfolgreich",
    body: "CI Pipeline #43 wurde erfolgreich abgeschlossen",
    tag: "build-test-succeeded",
    url: "/pipelines",
  },
  "pr.reviewer": {
    title: "Review angefragt",
    body: "Du wurdest als Reviewer hinzugefuegt: feat: Web Push Notifications",
    tag: "pr-reviewer-test",
    url: "/pull-requests",
  },
  "pr.comment": {
    title: "Neuer PR-Kommentar",
    body: "feat: Web Push Notifications: \"Sieht gut aus, bitte noch die Tests ergaenzen\"",
    tag: "pr-comment-test",
    url: "/pull-requests",
  },
  "release.approval": {
    title: "Approval ausstehend",
    body: "Release-2026.03 wartet auf Freigabe fuer Production",
    tag: "approval-test",
    url: "/releases",
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: {
    org: string;
    project: string;
    azureUserId: string;
    eventType: TestEventType;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiger Request-Body" }, { status: 400 });
  }

  const org = normalizeText(body.org);
  const project = normalizeText(body.project);
  const azureUserId = normalizeText(body.azureUserId);
  const eventType = body.eventType;

  if (!org || !project || !azureUserId) {
    return NextResponse.json(
      { error: "org, project und azureUserId sind Pflichtfelder" },
      { status: 400 }
    );
  }

  const template = TEST_NOTIFICATIONS[eventType];
  if (!template) {
    return NextResponse.json(
      { error: `Unbekannter eventType: ${eventType}. Erlaubt: ${Object.keys(TEST_NOTIFICATIONS).join(", ")}` },
      { status: 400 }
    );
  }
  const notification: WebhookNotificationPayload =
    eventType === "pr.comment"
      ? { ...template, tag: `pr-comment-test-${Date.now()}` }
      : template;

  const pushConfig = ensureWebPushConfigured();
  if (!pushConfig.ok) {
    return NextResponse.json({ ok: false, error: pushConfig.error }, { status: 500 });
  }
  const webPush = getWebPushClient();

  const subscriptions = getSubscriptionsForUsers(org, project, [azureUserId]);
  const uniqueSubscriptions = dedupeSubscriptionsByEndpoint(subscriptions).filter(
    (subscription) => subscription.eventPreferences[eventType]
  );

  if (uniqueSubscriptions.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Keine aktive Subscription mit diesem Benachrichtigungstyp gefunden. Bitte Notifications aktivieren oder den Event-Typ in den Einstellungen einschalten.",
      },
      { status: 404 }
    );
  }

  const payload = JSON.stringify(notification);
  let sent = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    uniqueSubscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload,
          { TTL: 60, urgency: "high" }
        );
        sent++;
      } catch (err) {
        const status = getWebPushErrorStatusCode(err);
        if (isExpiredSubscriptionError(err)) {
          removeSubscription(sub.endpoint);
          errors.push(`Abgelaufene Subscription entfernt (${status})`);
        } else {
          const suffix = status ? ` (${status})` : "";
          errors.push(`Sendefehler${suffix}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    })
  );

  return NextResponse.json({
    ok: sent > 0,
    sent,
    total: uniqueSubscriptions.length,
    notification,
    errors: errors.length > 0 ? errors : undefined,
  });
}
