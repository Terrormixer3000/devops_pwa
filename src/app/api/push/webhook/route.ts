import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { dedupeSubscriptionsByEndpoint, normalizeText } from "@/lib/server/pushRouteUtils";
import { getSubscriptionsForUsers, removeSubscription } from "@/lib/server/subscriptionDb";
import {
  ensureWebPushConfigured,
  getWebPushClient,
  getWebPushErrorStatusCode,
  isExpiredSubscriptionError,
} from "@/lib/server/webPush";
import type { AzureServiceHookPayload, WebhookNotificationPayload } from "@/types";

export const runtime = "nodejs";

function decodeBasicAuthPassword(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Basic ")) return null;

  const encoded = authHeader.slice("Basic ".length);
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return decoded.split(":").slice(1).join(":");
  } catch {
    return null;
  }
}

/**
 * Prueft die Basic-Auth des eingehenden Webhooks gegen das konfigurierte WEBHOOK_SECRET.
 * Azure DevOps sendet Basic Auth wenn im Service Hook ein Passwort gesetzt wurde.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = (process.env.WEBHOOK_SECRET ?? "").trim();
  // Wenn kein Secret konfiguriert, Anfragen ohne Pruefung zulassen (nur fuer lokale Entwicklung)
  if (!secret) return true;

  const password = decodeBasicAuthPassword(req);
  if (password === null) return false;

  const expected = Buffer.from(secret, "utf-8");
  const provided = Buffer.from(password, "utf-8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

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
function buildNotification(payload: AzureServiceHookPayload): WebhookNotificationPayload | null {
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
          title: "Build fehlgeschlagen",
          body: `${label} ist fehlgeschlagen`,
          tag: `build-${buildTagId}`,
          url: resource.id ? `/pipelines/${resource.id}` : "/pipelines",
        };
      }
      if (resource.result === "succeeded") {
        return {
          title: "Build erfolgreich",
          body: `${label} wurde erfolgreich abgeschlossen`,
          tag: `build-${buildTagId}`,
          url: resource.id ? `/pipelines/${resource.id}` : "/pipelines",
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
        title: "Review angefragt",
        body: `Du wurdest als Reviewer hinzugefuegt: ${prTitle}`,
        tag: `pr-reviewer-${prId ?? Date.now()}`,
        url: prId && repoId ? `/pull-requests/${repoId}/${prId}` : "/pull-requests",
      };
    }

    // PR: Kommentar hinzugefuegt
    case "git.pullrequest.commented": {
      const prTitle = resource.title ?? "Pull Request";
      const prId = resource.pullRequestId;
      const repoId = resource.repository?.id ?? resource.repository?.name ?? "";
      const preview = resource.comment?.content?.replace(/\s+/g, " ").trim().slice(0, 80) ?? "";
      return {
        title: "Neuer PR-Kommentar",
        body: preview ? `${prTitle}: "${preview}"` : prTitle,
        tag: `pr-comment-${prId ?? Date.now()}-${Date.now()}`,
        url: prId && repoId ? `/pull-requests/${repoId}/${prId}` : "/pull-requests",
      };
    }

    // Release-Deployment Approval ausstehend
    case "ms.vss-release.deployment-approval-pending-event": {
      const releaseName = resource.approval?.release?.name ?? resource.release?.name ?? "Release";
      const envName = resource.approval?.releaseEnvironment?.name ?? resource.releaseEnvironment?.name ?? "";
      const releaseId = resource.release?.id ?? resource.approval?.release?.id;
      return {
        title: "Approval ausstehend",
        body: envName
          ? `${releaseName} wartet auf Freigabe fuer ${envName}`
          : `${releaseName} wartet auf deine Freigabe`,
        tag: `approval-${releaseId ?? Date.now()}`,
        url: releaseId ? `/releases/${releaseId}` : "/releases",
      };
    }

    default:
      return null;
  }
}

function uniqueIds(values: Array<string | undefined>): string[] {
  const normalized = values.map((value) => normalizeText(value)).filter(Boolean);
  return [...new Set(normalized)];
}

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
  // Authentifizierung pruefen
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let payload: AzureServiceHookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiger Request-Body" }, { status: 400 });
  }

  // Notification erzeugen
  const notification = buildNotification(payload);
  if (!notification) {
    // Event wird nicht unterstuetzt — 200 zurueckgeben damit Azure DevOps nicht erneut sendet
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Org + Projekt aus Payload extrahieren
  const target = extractOrgProject(payload);
  if (!target) {
    console.warn("[webhook] Konnte Org/Projekt nicht aus Payload extrahieren:", payload.eventType);
    return NextResponse.json({ ok: true, skipped: true });
  }

  const targetAzureUserIds = getTargetAzureUserIds(payload);
  if (targetAzureUserIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, matchedUsers: 0, skipped: true });
  }

  const pushConfig = ensureWebPushConfigured();
  if (!pushConfig.ok) {
    console.error("[webhook] Web Push ist nicht konfiguriert:", pushConfig.error);
    return NextResponse.json({ ok: false, error: pushConfig.error }, { status: 500 });
  }
  const webPush = getWebPushClient();

  const subscriptions = getSubscriptionsForUsers(target.org, target.project, targetAzureUserIds);
  const uniqueSubscriptions = dedupeSubscriptionsByEndpoint(subscriptions);

  if (uniqueSubscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, matchedUsers: targetAzureUserIds.length });
  }

  const notificationPayload = JSON.stringify(notification);
  let sent = 0;

  // Alle Subscriptions benachrichtigen; abgelaufene (410 Gone) automatisch entfernen
  await Promise.allSettled(
    uniqueSubscriptions.map(async (sub) => {
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
          // Subscription ist abgelaufen oder ungueltig -> aus DB entfernen
          console.info("[webhook] Abgelaufene Subscription entfernt:", sub.endpoint.slice(-20));
          removeSubscription(sub.endpoint);
        } else {
          const suffix = status ? ` (${status})` : "";
          console.error(`[webhook] Sendefehler fuer Subscription${suffix}:`, err);
        }
      }
    })
  );

  return NextResponse.json({
    ok: true,
    sent,
    total: uniqueSubscriptions.length,
    matchedUsers: targetAzureUserIds.length,
  });
}
