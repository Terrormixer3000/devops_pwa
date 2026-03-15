/**
 * Einfache dateibasierte Subscription-Datenbank fuer lokalen Node.js-Betrieb.
 *
 * Schema der JSON-Datei:
 * {
 *   "org::project::azureuserid": [
 *     {
 *       endpoint,
 *       keys: { p256dh, auth },
 *       org,
 *       project,
 *       azureUserId,
 *       displayName,
 *       createdAt
 *     }
 *   ]
 * }
 *
 * Dieses Modul darf nur in Server-Komponenten und API Routes verwendet werden (Node.js-only).
 */

import fs from "fs";
import path from "path";
import { timingSafeEqual } from "node:crypto";
import type { PushSubscriptionRecord } from "@/types";
import { normalizePushEventPreferences } from "@/lib/utils/pushEventPreferences";

const DB_PATH = path.join(process.cwd(), "data", "subscriptions.json");

type SubscriptionDb = Record<string, PushSubscriptionRecord[]>;

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeAzureUserId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEndpoint(value: string): string {
  return value.trim();
}

function dedupeByEndpoint(records: PushSubscriptionRecord[]): PushSubscriptionRecord[] {
  const byEndpoint = new Map<string, PushSubscriptionRecord>();
  for (const record of records) {
    byEndpoint.set(record.endpoint, normalizeRecord(record));
  }
  return [...byEndpoint.values()];
}

function tokensEqual(expectedToken: string, providedToken: string): boolean {
  const expected = Buffer.from(expectedToken, "utf-8");
  const provided = Buffer.from(providedToken, "utf-8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

function normalizeRecord(record: PushSubscriptionRecord): PushSubscriptionRecord {
  return {
    ...record,
    endpoint: normalizeEndpoint(record.endpoint),
    org: normalizeSegment(record.org),
    project: normalizeSegment(record.project),
    azureUserId: normalizeAzureUserId(record.azureUserId),
    displayName: record.displayName.trim() || "Unbekannter Benutzer",
    eventPreferences: normalizePushEventPreferences(record.eventPreferences),
    // webhookToken unveraendert lassen — er wird als Auth-Credential genutzt
    webhookToken: record.webhookToken,
  };
}

function readDb(): SubscriptionDb {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as SubscriptionDb;
  } catch {
    return {};
  }
}

function writeDb(db: SubscriptionDb): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function makeGroupPrefix(org: string, project: string): string {
  return `${normalizeSegment(org)}::${normalizeSegment(project)}`;
}

function makeUserKey(org: string, project: string, azureUserId: string): string {
  return `${makeGroupPrefix(org, project)}::${normalizeAzureUserId(azureUserId)}`;
}

/** Gibt alle Subscriptions fuer eine bestimmte Organisation + Projekt zurueck. */
export function getSubscriptions(org: string, project: string): PushSubscriptionRecord[] {
  const db = readDb();
  const groupPrefix = makeGroupPrefix(org, project);
  const groupedRecords = Object.entries(db)
    .filter(([key]) => key.startsWith(`${groupPrefix}::`))
    .flatMap(([, records]) => records);

  return dedupeByEndpoint(groupedRecords);
}

/**
 * Gibt nur die Subscriptions der angegebenen Azure DevOps User-IDs zurueck.
 * So wird sichergestellt, dass Notifications nur an betroffene Personen gehen.
 */
export function getSubscriptionsForUsers(
  org: string,
  project: string,
  azureUserIds: string[]
): PushSubscriptionRecord[] {
  const normalizedIds = new Set(
    azureUserIds
      .map((id) => normalizeAzureUserId(id))
      .filter(Boolean)
  );
  if (normalizedIds.size === 0) return [];

  const db = readDb();
  const recordsFromUserKeys = [...normalizedIds].flatMap((azureUserId) => {
    const key = makeUserKey(org, project, azureUserId);
    return db[key] ?? [];
  });

  return dedupeByEndpoint(recordsFromUserKeys);
}

export function getSubscriptionByEndpoint(endpoint: string): PushSubscriptionRecord | null {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const db = readDb();

  for (const subscription of Object.values(db).flat()) {
    if (normalizeEndpoint(subscription.endpoint) === normalizedEndpoint) {
      return normalizeRecord(subscription);
    }
  }

  return null;
}

/**
 * Fuegt eine Subscription hinzu oder aktualisiert sie (Deduplizierung via endpoint).
 * Der endpoint ist die eindeutige ID einer PushSubscription (URL des Push-Service).
 */
export function upsertSubscription(record: PushSubscriptionRecord): void {
  const db = readDb();
  const normalizedRecord = normalizeRecord(record);
  const key = makeUserKey(
    normalizedRecord.org,
    normalizedRecord.project,
    normalizedRecord.azureUserId
  );
  const existingForEndpoint = Object.values(db).flat().find(
    (subscription) => subscription.endpoint === normalizedRecord.endpoint
  );

  // Endpoint ist global eindeutig. Vorherige Zuordnungen in allen Gruppen entfernen.
  for (const groupKey of Object.keys(db)) {
    db[groupKey] = db[groupKey].filter((subscription) => subscription.endpoint !== normalizedRecord.endpoint);
    if (db[groupKey].length === 0) {
      delete db[groupKey];
    }
  }

  const existing = db[key] ?? [];
  db[key] = [
    ...existing,
    {
      ...normalizedRecord,
      createdAt: existingForEndpoint?.createdAt ?? normalizedRecord.createdAt,
    },
  ];
  writeDb(db);
}

/**
 * Entfernt eine Subscription anhand ihres Endpoints aus allen Org/Projekt-Gruppen.
 * Wird aufgerufen wenn der User Notifications deaktiviert oder der Push-Service
 * einen 410 Gone Status zurueckgibt (Subscription abgelaufen).
 */
export function removeSubscription(endpoint: string): void {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const db = readDb();
  for (const key of Object.keys(db)) {
    db[key] = db[key].filter((s) => s.endpoint !== normalizedEndpoint);
    if (db[key].length === 0) {
      delete db[key];
    }
  }
  writeDb(db);
}

/**
 * Sucht eine Subscription anhand ihres Webhook-Tokens.
 * Verwendet timing-sicheren Vergleich um Timing-Angriffe zu verhindern.
 * Gibt null zurueck wenn kein Match gefunden wird.
 */
export function getSubscriptionByToken(token: string): PushSubscriptionRecord | null {
  if (!token) return null;

  const db = readDb();
  const all = Object.values(db).flat();

  for (const sub of all) {
    if (!sub.webhookToken) continue;
    if (tokensEqual(sub.webhookToken, token)) return normalizeRecord(sub);
  }

  return null;
}

export function matchesSubscriptionToken(
  subscription: Pick<PushSubscriptionRecord, "webhookToken"> | null | undefined,
  token: string
): boolean {
  if (!subscription?.webhookToken || !token) return false;
  return tokensEqual(subscription.webhookToken, token);
}

/** Gibt alle Subscriptions aus der gesamten DB zurueck (fuer Admin-Zwecke). */
export function getAllSubscriptions(): PushSubscriptionRecord[] {
  const db = readDb();
  return Object.values(db).flat().map((subscription) => normalizeRecord(subscription));
}
