import type { TimelineRecord } from "@/types";

/** Mögliche Zustände eines Timeline-Eintrags (Task, Job oder Stage). */
export type TimelineStatus = "running" | "failed" | "succeeded" | "canceled" | "partial" | "pending";
/** Badge-Variante für die farbliche Darstellung eines Timeline-Status. */
export type TimelineBadgeVariant = "success" | "danger" | "warning" | "info" | "muted";

/** Aggregierte Aufgaben-Zähler für einen Knoten der Timeline-Hierarchie. */
export interface TimelineStats {
  totalTasks: number;
  running: number;
  pending: number;
  succeeded: number;
  failed: number;
  canceled: number;
  partial: number;
}

/** Einzelner Knoten in der aufbereiteten Timeline-Hierarchie (Stage, Job oder Task). */
export interface TimelineViewNode {
  record: TimelineRecord;
  children: TimelineViewNode[];
  status: TimelineStatus;
  progress: number;
  durationSeconds: number | null;
  stats: TimelineStats;
}

/** Zusammenfassung aller Jobs und Tasks eines Builds für die Übersichtskarten. */
export interface TimelineSummary {
  totalJobs: number;
  runningJobs: number;
  failedJobs: number;
  succeededJobs: number;
  totalTasks: number;
  pendingTasks: number;
}

/** Aufbereitete Timeline-Ansicht mit Root-Knoten und Summary. */
export interface TimelineView {
  roots: TimelineViewNode[];
  summary: TimelineSummary;
}

/** Darstellungsmetadaten für einen einzelnen Timeline-Status (Farbe, Label, CSS-Klassen). */
export interface StatusMeta {
  label: string;
  badge: TimelineBadgeVariant;
  textClass: string;
  progressClass: string;
}

/** Nullwert-Konstante für `TimelineStats` — vermeidet wiederholte Objekt-Literale. */
export const EMPTY_STATS: TimelineStats = {
  totalTasks: 0,
  running: 0,
  pending: 0,
  succeeded: 0,
  failed: 0,
  canceled: 0,
  partial: 0,
};

/** Leeres Timeline-Array — stabiler Referenzwert für Query-Defaults. */
export const EMPTY_TIMELINE_RECORDS: TimelineRecord[] = [];

/** Status-Metadaten-Zuordnung für alle bekannten `TimelineStatus`-Werte. */
export const STATUS_META: Record<TimelineStatus, StatusMeta> = {
  running: { label: "Läuft", badge: "info", textClass: "text-blue-400", progressClass: "bg-blue-500" },
  failed: { label: "Fehler", badge: "danger", textClass: "text-red-400", progressClass: "bg-red-500" },
  succeeded: { label: "Erfolgreich", badge: "success", textClass: "text-green-400", progressClass: "bg-green-500" },
  canceled: { label: "Abgebrochen", badge: "muted", textClass: "text-slate-400", progressClass: "bg-slate-500" },
  partial: { label: "Teilweise", badge: "warning", textClass: "text-yellow-400", progressClass: "bg-yellow-500" },
  pending: { label: "Ausstehend", badge: "muted", textClass: "text-slate-500", progressClass: "bg-slate-600" },
};

/** Baut die hierarchische Timeline-Ansicht aus den flachen `TimelineRecord`-Eintraegen auf. */
export function buildTimelineView(records: TimelineRecord[]): TimelineView {
  if (records.length === 0) {
    return { roots: [], summary: { totalJobs: 0, runningJobs: 0, failedJobs: 0, succeededJobs: 0, totalTasks: 0, pendingTasks: 0 } };
  }
  const childrenMap = groupChildren(records);
  const roots = pickRootRecords(records).map((record) => buildNode(record, childrenMap));
  const allNodes = flattenNodes(roots);
  const jobNodes = allNodes.filter((n) => n.record.type === "Job" || n.record.type === "Phase");
  const effectiveJobNodes = jobNodes.length > 0 ? jobNodes : roots.filter((n) => n.record.type !== "Task");
  const totalTaskStats = roots.reduce((s, r) => mergeStats(s, r.stats), EMPTY_STATS);
  return {
    roots,
    summary: {
      totalJobs: effectiveJobNodes.length,
      runningJobs: effectiveJobNodes.filter((n) => n.status === "running").length,
      failedJobs: effectiveJobNodes.filter((n) => n.status === "failed").length,
      succeededJobs: effectiveJobNodes.filter((n) => n.status === "succeeded").length,
      totalTasks: totalTaskStats.totalTasks,
      pendingTasks: totalTaskStats.pending,
    },
  };
}

/** Gruppiert Timeline-Records nach ihrer `parentId`. */
function groupChildren(records: TimelineRecord[]): Map<string, TimelineRecord[]> {
  const map = new Map<string, TimelineRecord[]>();
  records.forEach((record) => {
    if (!record.parentId) return;
    const group = map.get(record.parentId) || [];
    group.push(record);
    map.set(record.parentId, group);
  });
  map.forEach((group, parentId) => map.set(parentId, sortRecords(group)));
  return map;
}

/** Gibt die Root-Records (ohne Parent) aus einem Record-Set zurück. */
function pickRootRecords(records: TimelineRecord[]): TimelineRecord[] {
  const stageRoots = sortRecords(records.filter((r) => r.type === "Stage"));
  if (stageRoots.length > 0) return stageRoots;
  const jobRoots = sortRecords(records.filter((r) => !r.parentId && (r.type === "Job" || r.type === "Phase")));
  if (jobRoots.length > 0) return jobRoots;
  const genericRoots = sortRecords(records.filter((r) => !r.parentId && r.type !== "Task"));
  if (genericRoots.length > 0) return genericRoots;
  return sortRecords(records.filter((r) => !r.parentId));
}

function sortRecords(records: TimelineRecord[]): TimelineRecord[] {
  return [...records].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function buildNode(record: TimelineRecord, childrenMap: Map<string, TimelineRecord[]>): TimelineViewNode {
  const children = (childrenMap.get(record.id) || []).map((child) => buildNode(child, childrenMap));
  const stats = computeStats(record, children);
  const status = resolveStatus(record, children, stats);
  return { record, children, status, progress: resolveProgress(record, status, stats), durationSeconds: getDurationSeconds(record), stats };
}

function computeStats(record: TimelineRecord, children: TimelineViewNode[]): TimelineStats {
  if (record.type === "Task") {
    const status = getRecordStatus(record);
    return { totalTasks: 1, running: status === "running" ? 1 : 0, pending: status === "pending" ? 1 : 0, succeeded: status === "succeeded" ? 1 : 0, failed: status === "failed" ? 1 : 0, canceled: status === "canceled" ? 1 : 0, partial: status === "partial" ? 1 : 0 };
  }
  return children.reduce((s, c) => mergeStats(s, c.stats), EMPTY_STATS);
}

function mergeStats(left: TimelineStats, right: TimelineStats): TimelineStats {
  return { totalTasks: left.totalTasks + right.totalTasks, running: left.running + right.running, pending: left.pending + right.pending, succeeded: left.succeeded + right.succeeded, failed: left.failed + right.failed, canceled: left.canceled + right.canceled, partial: left.partial + right.partial };
}

function resolveStatus(record: TimelineRecord, children: TimelineViewNode[], stats: TimelineStats): TimelineStatus {
  const own = getRecordStatus(record);
  if (record.type === "Task" || children.length === 0) return own;
  if (stats.failed > 0) return "failed";
  if (stats.running > 0) return "running";
  if (stats.partial > 0) return "partial";
  if (stats.totalTasks === 0) return own;
  if (stats.succeeded === stats.totalTasks) return "succeeded";
  if (stats.canceled === stats.totalTasks) return "canceled";
  if (stats.pending === stats.totalTasks) return "pending";
  if (stats.succeeded + stats.failed + stats.canceled + stats.partial === stats.totalTasks) return "partial";
  return own;
}

function resolveProgress(record: TimelineRecord, status: TimelineStatus, stats: TimelineStats): number {
  const explicit = typeof record.percentComplete === "number" ? record.percentComplete : undefined;
  if (typeof explicit === "number" && Number.isFinite(explicit)) return Math.max(0, Math.min(100, explicit));
  if (stats.totalTasks > 0) return Math.max(0, Math.min(100, Math.round(((stats.totalTasks - stats.running - stats.pending) / stats.totalTasks) * 100)));
  if (status === "running") return 45;
  if (status === "pending") return 0;
  return 100;
}

/** Leitet den sichtbaren Status eines Records aus `state` und `result` ab. */
export function getRecordStatus(record: TimelineRecord): TimelineStatus {
  const state = normalizeState(record.state);
  const result = normalizeState(record.result);
  if (state === "inprogress") return "running";
  if (result === "failed") return "failed";
  if (result === "succeeded") return "succeeded";
  if (result === "partiallysucceeded") return "partial";
  if (result === "canceled" || result === "cancelled") return "canceled";
  if (state === "completed") return "succeeded";
  return "pending";
}

function normalizeState(input?: string): string {
  return (input || "").replace(/\s+/g, "").toLowerCase();
}

/** Extrahiert die numerische Log-ID aus der Log-URL eines Timeline-Records. */
export function parseLogId(record: TimelineRecord): number | null {
  const token = record.log?.url?.split("/").pop();
  if (!token) return null;
  const parsed = parseInt(token, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDurationSeconds(record: TimelineRecord): number | null {
  if (!record.startTime || !record.finishTime) return null;
  const seconds = (new Date(record.finishTime).getTime() - new Date(record.startTime).getTime()) / 1000;
  if (!Number.isFinite(seconds)) return null;
  return Math.max(0, Math.round(seconds));
}

function flattenNodes(nodes: TimelineViewNode[]): TimelineViewNode[] {
  return nodes.flatMap((n) => [n, ...flattenNodes(n.children)]);
}

/** Formatiert eine Anzahl Sekunden als menschenlesbaren Zeitstring (z.B. "2m 15s"). */
export function formatDuration(durationSeconds: number): string {
  if (durationSeconds < 60) return `${durationSeconds}s`;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/** Bildet einen Build-Status-String auf eine Badge-Variante ab. */
export function getBuildStatusVariant(status: string): "success" | "danger" | "warning" | "info" | "muted" {
  const map: Record<string, "success" | "danger" | "warning" | "info" | "muted"> = {
    succeeded: "success", failed: "danger", canceled: "muted", inProgress: "info", partiallySucceeded: "warning",
  };
  return map[status] || "muted";
}

/** Übersetzt einen Build-Status-String in ein deutsches Anzeigelabel. */
export function getBuildStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    succeeded: "Erfolgreich", failed: "Fehlgeschlagen", canceled: "Abgebrochen",
    inProgress: "Läuft", partiallySucceeded: "Teilweise", none: "Ausstehend", notStarted: "Nicht gestartet",
  };
  return labels[status] || status;
}
