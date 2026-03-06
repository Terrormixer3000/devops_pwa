"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { TimelineRecord } from "@/types";
import { ChevronLeft, Download, FileText, Clock, CheckCircle, XCircle, Loader } from "lucide-react";
import Link from "next/link";

type Tab = "uebersicht" | "log" | "artefakte";

export default function BuildDetailPage({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = use(params);
  const buildIdNum = parseInt(buildId);
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [selectedLog, setSelectedLog] = useState<{ logId: number; name: string } | null>(null);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();

  // Build-Details laden
  const { data: build, isLoading, error } = useQuery({
    queryKey: ["build", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pipelinesService.getBuild(client, settings.project, buildIdNum)
      : Promise.reject("Kein Client"),
    enabled: !!client && !!settings,
    refetchInterval: (query) => query.state.data?.status === "inProgress" ? 5000 : false,
  });

  // Timeline laden
  const { data: timeline } = useQuery({
    queryKey: ["build-timeline", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pipelinesService.getBuildTimeline(client, settings.project, buildIdNum)
      : Promise.resolve({ records: [] }),
    enabled: !!client && !!settings && activeTab === "uebersicht",
    refetchInterval: build?.status === "inProgress" ? 5000 : false,
  });

  // Artefakte laden
  const { data: artifacts } = useQuery({
    queryKey: ["build-artifacts", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pipelinesService.getArtifacts(client, settings.project, buildIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings && activeTab === "artefakte",
  });

  // Log laden
  const { data: logContent, isLoading: logLoading } = useQuery({
    queryKey: ["build-log", buildIdNum, selectedLog?.logId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && selectedLog
      ? pipelinesService.getBuildLog(client, settings.project, buildIdNum, selectedLog.logId)
      : Promise.resolve(""),
    enabled: !!client && !!settings && !!selectedLog,
  });

  if (isLoading) return <div className="min-h-screen"><AppBar title="Build" /><PageLoader /></div>;
  if (error || !build) return <div className="min-h-screen"><AppBar title="Build" /><ErrorMessage message="Build konnte nicht geladen werden" /></div>;

  // Status-Farbe
  const statusVariant = getStatusVariant(build.result || build.status);

  // Timeline-Elemente gruppieren (nur Aufgaben der obersten Ebene)
  const topLevelRecords = timeline?.records
    .filter((r) => !r.parentId && r.type === "Phase")
    .sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  const stageRecords = timeline?.records
    .filter((r) => r.type === "Stage")
    .sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  const displayRecords = stageRecords.length > 0 ? stageRecords : topLevelRecords;

  return (
    <div className="min-h-screen">
      <AppBar title="Build Details" />

      {/* Zurueck */}
      <div className="px-4 pt-4">
        <Link href="/pipelines" className="flex items-center gap-1 text-sm text-blue-400 mb-3">
          <ChevronLeft size={16} /> Pipelines
        </Link>
      </div>

      {/* Build-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-base font-semibold text-white flex-1">{build.definition.name}</h1>
          <Badge variant={statusVariant}>{getStatusLabel(build.result || build.status)}</Badge>
        </div>
        <p className="text-xs text-slate-400 font-mono mb-1">#{build.buildNumber}</p>
        <p className="text-xs text-slate-500">
          {build.sourceBranch.replace("refs/heads/", "")} · {build.requestedBy.displayName}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {formatDistanceToNow(new Date(build.queueTime), { addSuffix: true, locale: de })}
        </p>
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
          <div className="divide-y divide-slate-800/50">
            {displayRecords.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">Keine Timeline-Daten verfuegbar</p>
            ) : (
              displayRecords.map((record) => (
                <TimelineItem
                  key={record.id}
                  record={record}
                  childRecords={timeline?.records.filter((r) => r.parentId === record.id) || []}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "log" && (
          <div className="p-4">
            {/* Log-Auswahl aus Timeline-Eintraegen */}
            {!selectedLog ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-3">Log eines Schritts auswaehlen:</p>
                {timeline?.records
                  .filter((r) => r.log?.url && r.type === "Task")
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedLog({ logId: parseInt(r.log!.url.split("/").pop()!), name: r.name })}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 rounded-xl text-left hover:bg-slate-800 transition-colors"
                    >
                      <FileText size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-white">{r.name}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setSelectedLog(null)} className="text-xs text-blue-400">
                    ← Zurueck
                  </button>
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
                    <p className="text-sm font-medium text-white">{artifact.name}</p>
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

// Timeline-Eintrag mit Unterpunkten
function TimelineItem({ record, childRecords }: { record: TimelineRecord; childRecords: TimelineRecord[] }) {
  const [expanded, setExpanded] = useState(record.state !== "completed" || record.result === "failed");

  const icon = getRecordIcon(record);
  const taskChildren = childRecords.filter((c) => c.type === "Task").sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{record.name}</p>
          {record.startTime && record.finishTime && (
            <p className="text-xs text-slate-500">
              {Math.round((new Date(record.finishTime).getTime() - new Date(record.startTime).getTime()) / 1000)}s
            </p>
          )}
        </div>
        {taskChildren.length > 0 && (
          <span className="text-xs text-slate-600">{expanded ? "▲" : "▼"}</span>
        )}
      </button>
      {expanded && taskChildren.length > 0 && (
        <div className="pl-8 border-l border-slate-800 ml-7">
          {taskChildren.map((child) => (
            <div key={child.id} className="flex items-center gap-3 px-4 py-2">
              {getRecordIcon(child)}
              <span className="text-sm text-slate-300">{child.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Status-Icon fuer Timeline-Eintraege
function getRecordIcon(record: TimelineRecord) {
  if (record.state === "inProgress") return <Loader size={16} className="text-blue-400 animate-spin flex-shrink-0" />;
  if (record.result === "succeeded") return <CheckCircle size={16} className="text-green-400 flex-shrink-0" />;
  if (record.result === "failed") return <XCircle size={16} className="text-red-400 flex-shrink-0" />;
  if (record.result === "canceled") return <XCircle size={16} className="text-slate-500 flex-shrink-0" />;
  return <Clock size={16} className="text-slate-600 flex-shrink-0" />;
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
