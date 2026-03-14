"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Clock, FileText, Loader, MinusCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { STATUS_META, formatDuration, parseLogId, getRecordStatus, getTimelineStatusLabel } from "@/lib/utils/timelineUtils";
import type { TimelineViewNode, TimelineSummary, TimelineStatus } from "@/lib/utils/timelineUtils";
import type { TimelineRecord } from "@/types";

/** Gibt das passende Status-Icon als React-Element für einen `TimelineStatus` zurück. */
export function getStatusIcon(status: TimelineStatus) {
  if (status === "running") return <Loader size={16} className="animate-spin flex-shrink-0" />;
  if (status === "succeeded") return <CheckCircle size={16} className="flex-shrink-0" />;
  if (status === "failed") return <XCircle size={16} className="flex-shrink-0" />;
  if (status === "partial") return <AlertTriangle size={16} className="flex-shrink-0" />;
  if (status === "canceled") return <MinusCircle size={16} className="flex-shrink-0" />;
  return <Clock size={16} className="flex-shrink-0" />;
}

/** Zusammenfassungskarten pro Stage/Status der Build-Timeline. */
export function JobsSummaryCards({ summary }: { summary: TimelineSummary }) {
  const t = useTranslations("timeline");
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: t("jobs"), value: summary.totalJobs, className: "text-slate-100" },
        { label: t("running"), value: summary.runningJobs, className: "text-blue-400" },
        { label: t("failed"), value: summary.failedJobs, className: "text-red-400" },
        { label: t("success"), value: summary.succeededJobs, className: "text-green-400" },
        { label: t("tasks"), value: summary.totalTasks, className: "text-slate-200" },
        { label: t("pending"), value: summary.pendingTasks, className: "text-slate-500" },
      ].map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5">
          <p className={`text-base font-semibold ${card.className}`}>{card.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Abschnitt einer einzelnen Stage — delegiert an Task-Zeile oder Gruppenknoten. */
export function TimelineNodeSection({
  node,
  depth,
  onOpenLog,
}: {
  node: TimelineViewNode;
  depth: number;
  onOpenLog: (logId: number, taskName: string) => void;
}) {
  if (node.record.type === "Task") return <TimelineTaskRow node={node} depth={depth} onOpenLog={onOpenLog} />;
  return <TimelineGroupNode node={node} depth={depth} onOpenLog={onOpenLog} />;
}

/** Gruppenknoten (Stage oder Job) in der Timeline-Hierarchie. */
function TimelineGroupNode({
  node,
  depth,
  onOpenLog,
}: {
  node: TimelineViewNode;
  depth: number;
  onOpenLog: (logId: number, taskName: string) => void;
}) {
  const t = useTranslations("timeline");
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(node.status === "running" || node.status === "failed");
  const meta = STATUS_META[node.status];

  return (
    <section
      className={`rounded-xl border border-slate-700/70 bg-slate-900/55 overflow-hidden ${depth === 0 ? "shadow-[0_8px_24px_rgba(2,6,23,0.22)]" : ""}`}
      style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}
    >
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 ${meta.textClass}`}>{getStatusIcon(node.status)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{node.record.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>{node.record.type}</span>
              {node.durationSeconds !== null && (
                <><span className="text-slate-600">•</span><span>{formatDuration(node.durationSeconds)}</span></>
              )}
              {node.stats.totalTasks > 0 && (
                <><span className="text-slate-600">•</span><span>{node.stats.totalTasks} Tasks</span></>
              )}
            </div>
          </div>
          <Badge variant={meta.badge}>{getTimelineStatusLabel(node.status, t)}</Badge>
          {hasChildren ? (expanded ? <ChevronDown size={15} className="mt-0.5 text-slate-500 flex-shrink-0" /> : <ChevronRight size={15} className="mt-0.5 text-slate-500 flex-shrink-0" />) : null}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full rounded-full transition-all ${meta.progressClass}`} style={{ width: `${node.progress}%` }} />
        </div>
      </button>

      {hasChildren && expanded && (
        <div className="space-y-2 border-t border-slate-800 px-2.5 py-2.5">
          {node.children.map((child) => (
            <TimelineNodeSection key={child.record.id} node={child} depth={depth + 1} onOpenLog={onOpenLog} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Einzelne Task-Zeile in der Timeline mit Status-Icon und Log-Link. */
function TimelineTaskRow({
  node,
  depth,
  onOpenLog,
}: {
  node: TimelineViewNode;
  depth: number;
  onOpenLog: (logId: number, taskName: string) => void;
}) {
  const meta = STATUS_META[node.status];
  const logId = parseLogId(node.record);

  return (
    <div
      className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2"
      style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}
    >
      <div className="flex items-center gap-2">
        <span className={meta.textClass}>{getStatusIcon(node.status)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-200">{node.record.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Task</span>
            {node.durationSeconds !== null && (
              <><span className="text-slate-600">•</span><span>{formatDuration(node.durationSeconds)}</span></>
            )}
          </div>
        </div>
        {logId && (
          <button
            type="button"
            onClick={() => onOpenLog(logId, node.record.name)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/80"
          >
            <FileText size={12} />
            Log
          </button>
        )}
      </div>
    </div>
  );
}

/** Log-Auswahlliste aus Task-Records. */
export function LogSelector({
  logRecords,
  onSelect,
}: {
  logRecords: TimelineRecord[];
  onSelect: (logId: number, name: string) => void;
}) {
  const t = useTranslations("timeline");
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">{t("selectLog")}:</p>
      {logRecords.map((record) => {
        const logId = parseLogId(record);
        if (!logId) return null;
        const meta = STATUS_META[getRecordStatus(record)];
        return (
          <button
            key={record.id}
            onClick={() => onSelect(logId, record.name)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 rounded-xl text-left hover:bg-slate-800 transition-colors"
          >
            <FileText size={14} className={`${meta.textClass} flex-shrink-0`} />
            <span className="text-sm text-slate-100 truncate flex-1">{record.name}</span>
            <Badge variant={meta.badge}>{getTimelineStatusLabel(getRecordStatus(record), t)}</Badge>
          </button>
        );
      })}
    </div>
  );
}
