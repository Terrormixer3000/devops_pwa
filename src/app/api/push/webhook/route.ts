import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook-Route fuer Azure DevOps Service Hooks.
 * Empfaengt Events (Build, PR, Release), uebersetzt sie in Push-Benachrichtigungen
 * und sendet sie nur an die zum Token gehoerige Browser-Subscription,
 * sofern das Event diesen Nutzer wirklich betrifft.
 * Auth: Query-Parameter `?t=<webhookToken>` (pro Browser-Subscription, 256-Bit-Entropie).
 */
import { normalizeText } from "@/lib/server/pushRouteUtils";
import { getSubscriptionByToken, removeSubscription } from "@/lib/server/subscriptionDb";
import {
  ensureWebPushConfigured,
  getWebPushClient,
  getWebPushErrorStatusCode,
  isExpiredSubscriptionError,
} from "@/lib/server/webPush";
import type { AzureServiceHookPayload, PushEventType, WebhookNotificationPayload } from "@/types";

export const runtime = "nodejs";

/** Extrahiert den Organisations-Namen aus einer Azure-DevOps-Basis-URL. */
function extractOrgFromBaseUrl(baseUrl: string): string {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname === "dev.azure.com") {
      const [org] = parsed.pathname.split("/").filter(Boolean);
      return normalizeText(org);
    }
    if (parsed.hostname.endsWith(".visualstudio.com")) {
      return normalizeText(parsed.hostname.replace(".visualstudio.com", ""));
    }
  } catch {
    return "";
  }
  return "";
}

/** Extrahiert den Projekt-Namen aus einer Azure-DevOps-Basis-URL. */
function extractProjectFromBaseUrl(baseUrl: string): string {
  try {
    const parsed = new URL(baseUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname === "dev.azure.com") {
      if (segments.length >= 2) return normalizeText(segments[1]);
      return "";
    }
    if (parsed.hostname.endsWith(".visualstudio.com")) {
      if (segments.length >= 1) return normalizeText(segments[0]);
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * Extrahiert Org und Projekt aus dem Azure DevOps Service Hook Payload.
 */
function extractOrgProject(payload: AzureServiceHookPayload): { org: string; project: string } | null {
  const candidateBaseUrls = [
    payload.resourceContainers?.account?.baseUrl,
    payload.resourceContainers?.collection?.baseUrl,
    payload.resourceContainers?.project?.baseUrl,
  ].filter((value): value is string => Boolean(value));

  let org = "";
  for (const baseUrl of candidateBaseUrls) {
    org = extractOrgFromBaseUrl(baseUrl);
    if (org) break;
  }

  const project =
    normalizeText(payload.resource?.project?.name) ||
    normalizeText(payload.resource?.repository?.project?.name) ||
    extractProjectFromBaseUrl(payload.resourceContainers?.project?.baseUrl ?? "");

  if (!org || !project) return null;
  return { org, project };
}

/**
 * Uebersetzt einen Azure DevOps Service Hook Event-Typ in eine lesbare Notification.
 * Gibt null zurueck wenn der Event-Typ nicht unterstuetzt wird.
 */
function buildNotification(payload: AzureServiceHookPayload): {
  eventType: PushEventType;
  notification: WebhookNotificationPayload;
} | null {
  const { eventType, resource } = payload;

  switch (eventType) {
    // Build abgeschlossen (fehlgeschlagen)
    case "build.complete": {
      const pipelineName = resource.definition?.name ?? "Pipeline";
      const buildNumber = resource.buildNumber ?? "";
      const label = buildNumber ? `${pipelineName} #${buildNumber}` : pipelineName;
      const buildTagId = resource.id ?? (buildNumber || String(Date.now()));

      if (resource.result === "failed" || resource.result === "partiallySucceeded") {
        return {
          eventType: "build.failed",
          notification: {
            title: "Build failed",
            body: `${label} failed`,
            tag: `build-${buildTagId}`,
            url: resource.id ? `/pipelines/${resource.id}` : "/pipelines",
          },
        };
      }
      if (resource.result === "succeeded") {
        return {
          eventType: "build.succeeded",
          notification: {
            title: "Build succeeded",
            body: `${label} completed successfully`,
            tag: `build-${buildTagId}`,
            url: resource.id ? `/pipelines/${resource.id}` : "/pipelines",
          },
        };
      }
      return null;
    }

    // PR: Reviewer hinzugefuegt
    case "git.pullrequest.reviewersUpdated": {
      const prTitle = resource.title ?? "Pull Request";
      const prId = resource.pullRequestId;
      const repoId = resource.repository?.id ?? resource.repository?.name ?? "";
      return {
        eventType: "pr.reviewer",
        notification: {
          title: "Review requested",
          body: `You were added as a reviewer: ${prTitle}`,
          tag: `pr-reviewer-${prId ?? Date.now()}`,
          url: prId && repoId ? `/pull-requests/${repoId}/${prId}` : "/pull-requests",
        },
      };
    }

    // PR: Kommentar hinzugefuegt
    case "git.pullrequest.commented": {
      const prTitle = resource.title ?? "Pull Request";
      const prId = resource.pullRequestId;
      const repoId = resource.repository?.id ?? resource.repository?.name ?? "";
      const preview = resource.comment?.content?.replace(/\s+/g, " ").trim().slice(0, 80) ?? "";
      return {
        eventType: "pr.comment",
        notification: {
          title: "New PR comment",
          body: preview ? `${prTitle}: "${preview}"` : prTitle,
          tag: `pr-comment-${prId ?? Date.now()}-${Date.now()}`,
          url: prId && repoId ? `/pull-requests/${repoId}/${prId}` : "/pull-requests",
        },
      };
    }

    // Release-Deployment Approval ausstehend
    case "ms.vss-release.deployment-approval-pending-event": {
      const releaseName = resource.approval?.release?.name ?? resource.release?.name ?? "Release";
      const envName = resource.approval?.releaseEnvironment?.name ?? resource.releaseEnvironment?.name ?? "";
      const releaseId = resource.release?.id ?? resource.approval?.release?.id;
      return {
        eventType: "release.approval",
        notification: {
          title: "Approval pending",
          body: envName
            ? `${releaseName} is waiting for approval for ${envName}`
            : `${releaseName} is waiting for your approval`,
          tag: `approval-${releaseId ?? Date.now()}`,
          url: releaseId ? `/releases/${releaseId}` : "/releases",
        },
      };
    }

    default:
      return null;
  }
}

/** Gibt eindeutige, nicht-leere IDs aus einem Array von optionalen Strings zurueck. */
function uniqueIds(values: Array<string | undefined>): string[] {
  const normalized = values.map((value) => normalizeText(value)).filter(Boolean);
  return [...new Set(normalized)];
}

/** Leitet anhand des Event-Typs die Ziel-Benutzer-IDs ab, die benachrichtigt werden sollen. */
function getTargetAzureUserIds(payload: AzureServiceHookPayload): string[] {
  const { eventType, resource } = payload;

  switch (eventType) {
    case "build.complete":
      return uniqueIds([resource.requestedFor?.id, resource.requestedBy?.id]);

    case "git.pullrequest.reviewersUpdated": {
      const reviewerIds = (resource.reviewers ?? []).map((reviewer) => reviewer.id);
      return uniqueIds([resource.reviewer?.id, ...reviewerIds]);
    }

    case "git.pullrequest.commented": {
      const recipientIds = new Set(uniqueIds([resource.createdBy?.id]));
      for (const reviewer of resource.reviewers ?? []) {
        if (reviewer.id) recipientIds.add(normalizeText(reviewer.id));
      }
      const commentAuthorId = normalizeText(resource.comment?.author?.id);
      if (commentAuthorId) recipientIds.delete(commentAuthorId);
      return [...recipientIds];
    }

    case "ms.vss-release.deployment-approval-pending-event":
      return uniqueIds([resource.approval?.approver?.id]);

    default:
      return [];
  }
}

/**
 * POST /api/push/webhook
 * Empfaengt Azure DevOps Service Hook Events und sendet Web Push Notifications
 * nur an die Benutzer, die sowohl betroffen sind als auch Push aktiviert haben.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Token-Authentifizierung: ?t=<webhookToken> ist Pflicht.
  // Jeder User hat einen eigenen Token, der beim Aktivieren der Notifications generiert wird.
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const tokenOwner = getSubscriptionByToken(token);
  if (!tokenOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: AzureServiceHookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Notification erzeugen
  const resolvedNotification = buildNotification(payload);
  if (!resolvedNotification) {
    // Event wird nicht unterstuetzt — 200 zurueckgeben damit Azure DevOps nicht erneut sendet
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Org + Projekt aus Payload extrahieren
  const target = extractOrgProject(payload);
  if (!target) {
    console.warn("[webhook] Could not extract org/project from payload:", payload.eventType);
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (tokenOwner.org !== target.org || tokenOwner.project !== target.project) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const targetAzureUserIds = getTargetAzureUserIds(payload);
  if (targetAzureUserIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, matchedUsers: 0, skipped: true });
  }

  if (!targetAzureUserIds.includes(tokenOwner.azureUserId)) {
    return NextResponse.json({ ok: true, sent: 0, matchedUsers: 0, skipped: true });
  }

  const pushConfig = ensureWebPushConfigured();
  if (!pushConfig.ok) {
    console.error("[webhook] Web Push is not configured:", pushConfig.error);
    return NextResponse.json({ ok: false, error: pushConfig.error }, { status: 500 });
  }
  const webPush = getWebPushClient();

  if (!tokenOwner.eventPreferences[resolvedNotification.eventType]) {
    return NextResponse.json({ ok: true, sent: 0, matchedUsers: 1, skipped: true });
  }

  const notificationPayload = JSON.stringify(resolvedNotification.notification);
  let sent = 0;

  // Notify the token owner's subscription and remove expired ones automatically.
  await Promise.allSettled(
    [tokenOwner].map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          notificationPayload,
          { TTL: 60, urgency: "high" }
        );
        sent++;
      } catch (err) {
        const status = getWebPushErrorStatusCode(err);
        if (isExpiredSubscriptionError(err)) {
          console.info("[webhook] Removed expired subscription:", sub.endpoint.slice(-20));
          removeSubscription(sub.endpoint);
        } else {
          const suffix = status ? ` (${status})` : "";
          console.error(`[webhook] Failed to send to subscription${suffix}:`, err);
        }
      }
    })
  );

  return NextResponse.json({
    ok: true,
    sent,
    total: 1,
    matchedUsers: 1,
  });
}
