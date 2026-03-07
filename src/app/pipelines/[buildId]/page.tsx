"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { BackActionButton, BackLink } from "@/components/ui/BackButton";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { TimelineRecord } from "@/types";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader,
  MinusCircle,
  RotateCcw,
  StopCircle,
  XCircle,
} from "lucide-react";

type Tab = "uebersicht" | "log" | "artefakte";
type TimelineStatus = "running" | "failed" | "succeeded" | "canceled" | "partial" | "pending";

type TimelineBadgeVariant = "success" | "danger" | "warning" | "info" | "muted";

interface TimelineStats {
  totalTasks: number;
  running: number;
  pending: number;
  succeeded: number;
  failed: number;
  canceled: number;
  partial: number;
}

interface TimelineViewNode {
  record: TimelineRecord;
  children: TimelineViewNode[];
  status: TimelineStatus;
  progress: number;
  durationSeconds: number | null;
  stats: TimelineStats;
}

interface TimelineSummary {
  totalJobs: number;
  runningJobs: number;
  failedJobs: number;
  succeededJobs: number;
  totalTasks: number;
  pendingTasks: number;
}

interface TimelineView {
  roots: TimelineViewNode[];
  summary: TimelineSummary;
}

interface StatusMeta {
  label: string;
  badge: TimelineBadgeVariant;
  textClass: string;
  progressClass: string;
}

const EMPTY_STATS: TimelineStats = {
  totalTasks: 0,
  running: 0,
  pending: 0,
  succeeded: 0,
  failed: 0,
  canceled: 0,
  partial: 0,
};
const EMPTY_TIMELINE_RECORDS: TimelineRecord[] = [];

const STATUS_META: Record<TimelineStatus, StatusMeta> = {
  running: {
    label: "Laeuft",
    badge: "info",
    textClass: "text-blue-400",
    progressClass: "bg-blue-500",
  },
  failed: {
    label: "Fehler",
    badge: "danger",
    textClass: "text-red-400",
    progressClass: "bg-red-500",
  },
  succeeded: {
    label: "Erfolgreich",
    badge: "success",
    textClass: "text-green-400",
    progressClass: "bg-green-500",
  },
  canceled: {
    label: "Abgebrochen",
    badge: "muted",
    textClass: "text-slate-400",
    progressClass: "bg-slate-500",
  },
  partial: {
    label: "Teilweise",
    badge: "warning",
    textClass: "text-yellow-400",
    progressClass: "bg-yellow-500",
  },
  pending: {
    label: "Ausstehend",
    badge: "muted",
    textClass: "text-slate-500",
    progressClass: "bg-slate-600",
  },
};

export default function BuildDetailPage({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = use(params);
  const buildIdNum = parseInt(buildId);
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [selectedLog, setSelectedLog] = useState<{ logId: number; name: string } | null>(null);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const router = useRouter();
  const qc = useQueryClient();

  // Build-Details laden
  const { data: build, isLoading, error } = useQuery({
    queryKey: ["build", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? pipelinesService.getBuild(client, settings.project, buildIdNum)
        : Promise.reject("Kein Client"),
    enabled: !!client && !!settings,
    refetchInterval: (query) => (query.state.data?.status === "inProgress" ? 5000 : false),
  });

  // Timeline laden
  const { data: timeline } = useQuery({
    queryKey: ["build-timeline", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? pipelinesService.getBuildTimeline(client, settings.project, buildIdNum)
        : Promise.resolve({ records: [] }),
    enabled: !!client && !!settings && (activeTab === "uebersicht" || activeTab === "log"),
    refetchInterval: build?.status === "inProgress" ? 5000 : false,
  });

  // Artefakte laden
  const { data: artifacts } = useQuery({
    queryKey: ["build-artifacts", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? pipelinesService.getArtifacts(client, settings.project, buildIdNum)
        : Promise.resolve([]),
    enabled: !!client && !!settings && activeTab === "artefakte",
  });

  // Log laden
  const { data: logContent, isLoading: logLoading } = useQuery({
    queryKey: ["build-log", buildIdNum, selectedLog?.logId, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings && selectedLog
        ? pipelinesService.getBuildLog(client, settings.project, buildIdNum, selectedLog.logId)
        : Promise.resolve(""),
    enabled: !!client && !!settings && !!selectedLog,
  });

  const timelineRecords = timeline?.records ?? EMPTY_TIMELINE_RECORDS;
  const timelineView = useMemo(() => buildTimelineView(timelineRecords), [timelineRecords]);
  const logRecords = useMemo(
    () =>
      timelineRecords
        .filter((record) => record.type === "Task" && parseLogId(record) !== null)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [timelineRecords]
  );

  // Build erneut starten (gleiche Definition + Branch)
  const retryMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !build) return Promise.reject(new Error("Kein Client"));
      return pipelinesService.queueBuild(client, settings.project, build.definition.id, build.sourceBranch);
    },
    onSuccess: (newBuild) => {
      qc.invalidateQueries({ queryKey: ["builds"] });
      router.push(`/pipelines/${newBuild.id}`);
    },
  });

  // Laufenden Build abbrechen
  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) return Promise.reject(new Error("Kein Client"));
      return pipelinesService.cancelBuild(client, settings.project, buildIdNum);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["build", buildIdNum] });
    },
  });

  if (isLoading) return <div className="min-h-screen"><AppBar title="Build" /><PageLoader /></div>;
  if (error || !build) return <div className="min-h-screen"><AppBar title="Build" /><ErrorMessage message="Build konnte nicht geladen werden" /></div>;

  const statusVariant = getStatusVariant(build.result || build.status);

  const handleOpenLog = (logId: number, name: string) => {
    setSelectedLog({ logId, name });
    setActiveTab("log");
  };

  return (
    <div className="min-h-screen">
      <AppBar title="Build Details" />

      {/* Zurueck */}
      <div className="px-4 pt-4">
        <BackLink href="/pipelines" label="Pipelines" className="mb-3" />
      </div>

      {/* Build-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-base font-semibold text-slate-100 flex-1">{build.definition.name}</h1>
          <Badge variant={statusVariant}>{getStatusLabel(build.result || build.status)}</Badge>
        </div>
        <p className="text-xs text-slate-400 font-mono mb-1">#{build.buildNumber}</p>
        <p className="text-xs text-slate-500">
          {build.sourceBranch.replace("refs/heads/", "")} · {build.requestedBy.displayName}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {formatDistanceToNow(new Date(build.queueTime), { addSuffix: true, locale: de })}
        </p>

        {/* Aktionsknopfe */}
        <div className="flex gap-2 mt-3">
          {/* Re-Run fuer abgeschlossene Builds */}
          {build.status === "completed" && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/30 hover:bg-blue-700/50 text-blue-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {retryMutation.isPending ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Erneut starten
            </button>
          )}
          {/* Abbrechen fuer laufende Builds */}
          {build.status === "inProgress" && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700/30 hover:bg-red-700/50 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending ? <Loader size={12} className="animate-spin" /> : <StopCircle size={12} />}
              Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex px-4">
          {[
            { key: "uebersicht", label: "Uebersicht" },
            { key: "log", label: "Logs" },
            { key: "artefakte", label: "Artefakte" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div>
        {activeTab === "uebersicht" && (
          <div className="space-y-3 px-3 py-3">
            {timelineView.roots.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">Keine Timeline-Daten verfuegbar</p>
            ) : (
              <>
                <JobsSummaryCards summary={timelineView.summary} />
                {timelineView.roots.map((rootNode) => (
                  <TimelineNodeSection
                    key={rootNode.record.id}
                    node={rootNode}
                    depth={0}
                    onOpenLog={handleOpenLog}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "log" && (
          <div className="p-4">
            {/* Log-Auswahl aus Timeline-Eintraegen */}
            {!selectedLog ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-3">Log eines Schritts auswaehlen:</p>
                {logRecords.length === 0 ? (
                  <p className="text-sm text-slate-500">Keine Task-Logs verfuegbar</p>
                ) : (
                  logRecords.map((record) => {
                    const logId = parseLogId(record);
                    if (!logId) return null;
                    const meta = STATUS_META[getRecordStatus(record)];
                    return (
                      <button
                        key={record.id}
                        onClick={() => setSelectedLog({ logId, name: record.name })}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 rounded-xl text-left hover:bg-slate-800 transition-colors"
                      >
                        <FileText size={14} className={`${meta.textClass} flex-shrink-0`} />
                        <span className="text-sm text-slate-100 truncate flex-1">{record.name}</span>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BackActionButton
                    onClick={() => setSelectedLog(null)}
                    label="Zurueck"
                    size="compact"
                  />
                  <span className="text-xs text-slate-400">{selectedLog.name}</span>
                </div>
                {logLoading ? (
                  <PageLoader />
                ) : (
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto">
                    {logContent || "Kein Log-Inhalt"}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "artefakte" && (
          <div className="p-4 space-y-2">
            {!artifacts?.length ? (
              <p className="text-sm text-slate-500 text-center py-6">Keine Artefakte</p>
            ) : (
              artifacts.map((artifact) => (
                <a
                  key={artifact.id}
                  href={artifact.resource.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Download size={16} className="text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100">{artifact.name}</p>
                    <p className="text-xs text-slate-500">{artifact.resource.type}</p>
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JobsSummaryCards({ summary }: { summary: TimelineSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "Jobs", value: summary.totalJobs, className: "text-slate-100" },
        { label: "Running", value: summary.runningJobs, className: "text-blue-400" },
        { label: "Fehler", value: summary.failedJobs, className: "text-red-400" },
        { label: "Erfolgreich", value: summary.succeededJobs, className: "text-green-400" },
        { label: "Tasks", value: summary.totalTasks, className: "text-slate-200" },
        { label: "Pending", value: summary.pendingTasks, className: "text-slate-500" },
      ].map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5">
          <p className={`text-base font-semibold ${card.className}`}>{card.value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

function TimelineNodeSection({
  node,
  depth,
  onOpenLog,
}: {
  node: TimelineViewNode;
  depth: number;
  onOpenLog: (logId: number, taskName: string) => void;
}) {
  if (node.record.type === "Task") {
    return <TimelineTaskRow node={node} depth={depth} onOpenLog={onOpenLog} />;
  }

  return <TimelineGroupNode node={node} depth={depth} onOpenLog={onOpenLog} />;
}

function TimelineGroupNode({
  node,
  depth,
  onOpenLog,
}: {
  node: TimelineViewNode;
  depth: number;
  onOpenLog: (logId: number, taskName: string) => void;
}) {

  const hasChildren = node.children.length > 0;
  const initiallyExpanded = node.status === "running" || node.status === "failed";
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const meta = STATUS_META[node.status];

  return (
    <section
      className={`rounded-xl border border-slate-700/70 bg-slate-900/55 overflow-hidden ${depth === 0 ? "shadow-[0_8px_24px_rgba(2,6,23,0.22)]" : ""}`}
      style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}
    >
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((current) => !current)}
        className="w-full px-3 py-2.5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 ${meta.textClass}`}>
            {getStatusIcon(node.status)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{node.record.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>{node.record.type}</span>
              {node.durationSeconds !== null && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{formatDuration(node.durationSeconds)}</span>
                </>
              )}
              {node.stats.totalTasks > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>{node.stats.totalTasks} Tasks</span>
                </>
              )}
            </div>
          </div>
          <Badge variant={meta.badge}>{meta.label}</Badge>
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={15} className="mt-0.5 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronRight size={15} className="mt-0.5 text-slate-500 flex-shrink-0" />
            )
          ) : null}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full rounded-full transition-all ${meta.progressClass}`} style={{ width: `${node.progress}%` }} />
        </div>
      </button>

      {hasChildren && expanded ? (
        <div className="space-y-2 border-t border-slate-800 px-2.5 py-2.5">
          {node.children.map((child) => (
            <TimelineNodeSection
              key={child.record.id}
              node={child}
              depth={depth + 1}
              onOpenLog={onOpenLog}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

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
              <>
                <span className="text-slate-600">•</span>
                <span>{formatDuration(node.durationSeconds)}</span>
              </>
            )}
          </div>
        </div>
        {logId ? (
          <button
            type="button"
            onClick={() => onOpenLog(logId, node.record.name)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700/80"
          >
            <FileText size={12} />
            Log
          </button>
        ) : null}
      </div>
    </div>
  );
}

function buildTimelineView(records: TimelineRecord[]): TimelineView {
  if (records.length === 0) {
    return {
      roots: [],
      summary: {
        totalJobs: 0,
        runningJobs: 0,
        failedJobs: 0,
        succeededJobs: 0,
        totalTasks: 0,
        pendingTasks: 0,
      },
    };
  }

  const childrenMap = groupChildren(records);
  const roots = pickRootRecords(records).map((record) => buildNode(record, childrenMap));
  const allNodes = flattenNodes(roots);
  const jobNodes = allNodes.filter((node) => node.record.type === "Job" || node.record.type === "Phase");
  const effectiveJobNodes = jobNodes.length > 0 ? jobNodes : roots.filter((node) => node.record.type !== "Task");
  const totalTaskStats = roots.reduce((stats, root) => mergeStats(stats, root.stats), EMPTY_STATS);

  return {
    roots,
    summary: {
      totalJobs: effectiveJobNodes.length,
      runningJobs: effectiveJobNodes.filter((node) => node.status === "running").length,
      failedJobs: effectiveJobNodes.filter((node) => node.status === "failed").length,
      succeededJobs: effectiveJobNodes.filter((node) => node.status === "succeeded").length,
      totalTasks: totalTaskStats.totalTasks,
      pendingTasks: totalTaskStats.pending,
    },
  };
}

function groupChildren(records: TimelineRecord[]): Map<string, TimelineRecord[]> {
  const map = new Map<string, TimelineRecord[]>();
  records.forEach((record) => {
    if (!record.parentId) return;
    const group = map.get(record.parentId) || [];
    group.push(record);
    map.set(record.parentId, group);
  });

  map.forEach((group, parentId) => {
    map.set(parentId, sortRecords(group));
  });

  return map;
}

function pickRootRecords(records: TimelineRecord[]): TimelineRecord[] {
  const stageRoots = sortRecords(records.filter((record) => record.type === "Stage"));
  if (stageRoots.length > 0) return stageRoots;

  const jobRoots = sortRecords(
    records.filter((record) => !record.parentId && (record.type === "Job" || record.type === "Phase"))
  );
  if (jobRoots.length > 0) return jobRoots;

  const genericRoots = sortRecords(
    records.filter((record) => !record.parentId && record.type !== "Task")
  );
  if (genericRoots.length > 0) return genericRoots;

  return sortRecords(records.filter((record) => !record.parentId));
}

function sortRecords(records: TimelineRecord[]): TimelineRecord[] {
  return [...records].sort((left, right) => (left.order || 0) - (right.order || 0));
}

function buildNode(record: TimelineRecord, childrenMap: Map<string, TimelineRecord[]>): TimelineViewNode {
  const children = (childrenMap.get(record.id) || []).map((child) => buildNode(child, childrenMap));
  const stats = computeStats(record, children);
  const status = resolveStatus(record, children, stats);
  const progress = resolveProgress(record, status, stats);

  return {
    record,
    children,
    status,
    progress,
    durationSeconds: getDurationSeconds(record),
    stats,
  };
}

function computeStats(record: TimelineRecord, children: TimelineViewNode[]): TimelineStats {
  if (record.type === "Task") {
    const status = getRecordStatus(record);
    return {
      totalTasks: 1,
      running: status === "running" ? 1 : 0,
      pending: status === "pending" ? 1 : 0,
      succeeded: status === "succeeded" ? 1 : 0,
      failed: status === "failed" ? 1 : 0,
      canceled: status === "canceled" ? 1 : 0,
      partial: status === "partial" ? 1 : 0,
    };
  }

  return children.reduce((stats, child) => mergeStats(stats, child.stats), EMPTY_STATS);
}

function mergeStats(left: TimelineStats, right: TimelineStats): TimelineStats {
  return {
    totalTasks: left.totalTasks + right.totalTasks,
    running: left.running + right.running,
    pending: left.pending + right.pending,
    succeeded: left.succeeded + right.succeeded,
    failed: left.failed + right.failed,
    canceled: left.canceled + right.canceled,
    partial: left.partial + right.partial,
  };
}

function resolveStatus(
  record: TimelineRecord,
  children: TimelineViewNode[],
  stats: TimelineStats
): TimelineStatus {
  const ownStatus = getRecordStatus(record);
  if (record.type === "Task" || children.length === 0) return ownStatus;

  if (stats.failed > 0) return "failed";
  if (stats.running > 0) return "running";
  if (stats.partial > 0) return "partial";
  if (stats.totalTasks === 0) return ownStatus;
  if (stats.succeeded === stats.totalTasks) return "succeeded";
  if (stats.canceled === stats.totalTasks) return "canceled";
  if (stats.pending === stats.totalTasks) return "pending";
  if (stats.succeeded + stats.failed + stats.canceled + stats.partial === stats.totalTasks) return "partial";
  return ownStatus;
}

function resolveProgress(
  record: TimelineRecord,
  status: TimelineStatus,
  stats: TimelineStats
): number {
  const explicitProgress = typeof record.percentComplete === "number" ? record.percentComplete : undefined;
  if (typeof explicitProgress === "number" && Number.isFinite(explicitProgress)) {
    return Math.max(0, Math.min(100, explicitProgress));
  }

  if (stats.totalTasks > 0) {
    const doneCount = stats.totalTasks - stats.running - stats.pending;
    return Math.max(0, Math.min(100, Math.round((doneCount / stats.totalTasks) * 100)));
  }

  if (status === "running") return 45;
  if (status === "pending") return 0;
  return 100;
}

function getRecordStatus(record: TimelineRecord): TimelineStatus {
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

function parseLogId(record: TimelineRecord): number | null {
  const token = record.log?.url?.split("/").pop();
  if (!token) return null;
  const parsed = parseInt(token, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDurationSeconds(record: TimelineRecord): number | null {
  if (!record.startTime || !record.finishTime) return null;
  const seconds =
    (new Date(record.finishTime).getTime() - new Date(record.startTime).getTime()) / 1000;
  if (!Number.isFinite(seconds)) return null;
  return Math.max(0, Math.round(seconds));
}

function flattenNodes(nodes: TimelineViewNode[]): TimelineViewNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function formatDuration(durationSeconds: number): string {
  if (durationSeconds < 60) return `${durationSeconds}s`;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function getStatusIcon(status: TimelineStatus) {
  if (status === "running") return <Loader size={16} className="animate-spin flex-shrink-0" />;
  if (status === "succeeded") return <CheckCircle size={16} className="flex-shrink-0" />;
  if (status === "failed") return <XCircle size={16} className="flex-shrink-0" />;
  if (status === "partial") return <AlertTriangle size={16} className="flex-shrink-0" />;
  if (status === "canceled") return <MinusCircle size={16} className="flex-shrink-0" />;
  return <Clock size={16} className="flex-shrink-0" />;
}

// Status-Variante fuer Badge
function getStatusVariant(status: string): "success" | "danger" | "warning" | "info" | "muted" {
  const map: Record<string, "success" | "danger" | "warning" | "info" | "muted"> = {
    succeeded: "success",
    failed: "danger",
    canceled: "muted",
    inProgress: "info",
    partiallySucceeded: "warning",
  };
  return map[status] || "muted";
}

// Lesbarer Status-Text
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    succeeded: "Erfolgreich",
    failed: "Fehlgeschlagen",
    canceled: "Abgebrochen",
    inProgress: "Laeuft",
    partiallySucceeded: "Teilweise",
    none: "Ausstehend",
    notStarted: "Nicht gestartet",
  };
  return labels[status] || status;
}
