"use client";

import { buildStatusMeta } from "@/lib/utils/buildStatus";

/** Farbiger Indikator-Punkt fuer den Build-Status (z.B. im Dashboard). */
export function BuildStatusDot({ status }: { status: string }) {
  const meta = buildStatusMeta(status);
  return <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dotClass}`} />;
}

/** Farbiges Status-Icon fuer einen Build (z.B. in der Pipeline-Liste). */
export function BuildStatusIcon({ status }: { status: string }) {
  const meta = buildStatusMeta(status);
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bgClass}`}>
      <div className={`w-2.5 h-2.5 rounded-full bg-current ${meta.colorClass} ${meta.pulse ? "animate-pulse" : ""}`} />
    </div>
  );
}
