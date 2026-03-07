import { randomBytes } from "node:crypto";
import type { PushSubscriptionRecord } from "@/types";

export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Generiert einen kryptographisch sicheren Token (64 Hex-Zeichen = 256 Bit Entropie).
 * Wird beim Registrieren einer Subscription als Webhook-Authentifizierungstoken verwendet.
 */
export function generateWebhookToken(): string {
  return randomBytes(32).toString("hex");
}

export function dedupeSubscriptionsByEndpoint(
  subscriptions: PushSubscriptionRecord[]
): PushSubscriptionRecord[] {
  return [...new Map(subscriptions.map((subscription) => [subscription.endpoint, subscription])).values()];
}

export function isSecureSubscriptionEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("https://");
}
