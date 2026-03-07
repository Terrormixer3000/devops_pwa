import type { PushSubscriptionRecord } from "@/types";

export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function dedupeSubscriptionsByEndpoint(
  subscriptions: PushSubscriptionRecord[]
): PushSubscriptionRecord[] {
  return [...new Map(subscriptions.map((subscription) => [subscription.endpoint, subscription])).values()];
}

export function isSecureSubscriptionEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("https://");
}
