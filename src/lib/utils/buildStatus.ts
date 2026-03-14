/**
 * Zentrales Status-Mapping fuer Build/Pipeline-Ergebnisse.
 * Wird von Dashboard, Pipeline-Liste, Build-Detail und Release-Detail genutzt.
 */

export interface BuildStatusMeta {
  badgeVariant: "success" | "danger" | "info" | "muted" | "warning" | "default";
  colorClass: string;
  bgClass: string;
  dotClass: string;
  pulse: boolean;
}

const STATUS_MAP: Record<string, BuildStatusMeta> = {
  succeeded: {
    badgeVariant: "success",
    colorClass: "text-green-400",
    bgClass: "bg-green-500/20",
    dotClass: "bg-green-400",
    pulse: false,
  },
  failed: {
    badgeVariant: "danger",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/20",
    dotClass: "bg-red-400",
    pulse: false,
  },
  canceled: {
    badgeVariant: "muted",
    colorClass: "text-slate-400",
    bgClass: "bg-slate-500/20",
    dotClass: "bg-slate-500",
    pulse: false,
  },
  inProgress: {
    badgeVariant: "info",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/20",
    dotClass: "bg-blue-400 animate-pulse",
    pulse: true,
  },
  partiallySucceeded: {
    badgeVariant: "warning",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-500/20",
    dotClass: "bg-yellow-400",
    pulse: false,
  },
  none: {
    badgeVariant: "muted",
    colorClass: "text-slate-500",
    bgClass: "bg-slate-700/30",
    dotClass: "bg-slate-600",
    pulse: false,
  },
};

const DEFAULT_META: BuildStatusMeta = STATUS_MAP.none;

/** Gibt das Status-Metadaten-Objekt fuer einen Build/Pipeline-Status zurueck. */
export function buildStatusMeta(status: string): BuildStatusMeta {
  return STATUS_MAP[status] || DEFAULT_META;
}
