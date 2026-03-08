import { randomBytes } from "node:crypto";
import type { PushSubscriptionRecord } from "@/types";

/** Bereinigt einen beliebigen Wert zu einem getrimmten String (Fallback: ""). */
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

/**
 * Entfernt doppelte Eintraege aus einer Subscription-Liste anhand des Endpoints.
 * Der Endpoint ist global eindeutig pro PushSubscription-Objekt.
 */
export function dedupeSubscriptionsByEndpoint(
  subscriptions: PushSubscriptionRecord[]
): PushSubscriptionRecord[] {
  return [...new Map(subscriptions.map((subscription) => [subscription.endpoint, subscription])).values()];
}

/** Prueft ob ein Subscription-Endpoint ueber HTTPS gesichert ist (Pflicht fuer Web Push). */
export function isSecureSubscriptionEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("https://");
}
