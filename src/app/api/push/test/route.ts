/**
 * POST /api/push/test
 *
 * Test-Endpunkt: Sendet eine Web Push Notification direkt an genau die
 * Browser-Subscription, die zum uebergebenen Webhook-Token gehoert, ohne einen
 * echten Azure DevOps Service Hook zu brauchen.
 *
 * Body: {
 *   token: string
 *   eventType: "build.failed" | "build.succeeded" | "pr.reviewer" | "pr.comment" | "release.approval"
 * }
 *
 * Nur fuer Entwicklung und Tests gedacht. In Produktion kann dieser Endpunkt
 * durch eine Umgebungsvariable deaktiviert werden.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionByToken, removeSubscription } from "@/lib/server/subscriptionDb";
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
    title: "Build failed",
    body: "CI Pipeline #42 failed (branch: feature/push-test)",
    tag: "build-test-failed",
    url: "/pipelines",
  },
  "build.succeeded": {
    title: "Build succeeded",
    body: "CI Pipeline #43 completed successfully",
    tag: "build-test-succeeded",
    url: "/pipelines",
  },
  "pr.reviewer": {
    title: "Review requested",
    body: "You were added as a reviewer: feat: Web Push Notifications",
    tag: "pr-reviewer-test",
    url: "/pull-requests",
  },
  "pr.comment": {
    title: "New PR comment",
    body: "feat: Web Push Notifications: \"Looks good, please add the tests\"",
    tag: "pr-comment-test",
    url: "/pull-requests",
  },
  "release.approval": {
    title: "Approval pending",
    body: "Release-2026.03 is waiting for approval for Production",
    tag: "approval-test",
    url: "/releases",
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const isEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_PUSH_TEST_API === "true";
  if (!isEnabled) {
    return NextResponse.json({ error: "Push test API is disabled" }, { status: 403 });
  }

  let body: {
    token?: string;
    eventType: TestEventType;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const eventType = body.eventType;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = TEST_NOTIFICATIONS[eventType];
  if (!template) {
    return NextResponse.json(
      { error: `Unknown eventType: ${eventType}. Allowed: ${Object.keys(TEST_NOTIFICATIONS).join(", ")}` },
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

  const subscription = getSubscriptionByToken(token);
  if (!subscription) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!subscription.eventPreferences[eventType]) {
    return NextResponse.json(
      {
        ok: false,
        error: "This notification type is disabled for this browser subscription.",
      },
      { status: 403 }
    );
  }

  const payload = JSON.stringify(notification);
  let sent = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    [subscription].map(async (sub) => {
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
          errors.push(`Expired subscription removed (${status})`);
        } else {
          const suffix = status ? ` (${status})` : "";
          errors.push(`Send failed${suffix}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    })
  );

  return NextResponse.json({
    ok: sent > 0,
    sent,
    total: 1,
    notification,
    errors: errors.length > 0 ? errors : undefined,
  });
}
