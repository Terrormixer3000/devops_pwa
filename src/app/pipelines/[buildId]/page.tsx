"use client";

import { useTranslations } from "next-intl";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { TabBar } from "@/components/ui/TabBar";
import { timeAgo } from "@/lib/utils/timeAgo";
import { stripRefPrefix } from "@/lib/utils/gitUtils";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { BackActionButton } from "@/components/ui/BackButton";
import Link from "next/link";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { buildTimelineView, parseLogId, getBuildStatusVariant, getBuildStatusLabel, EMPTY_TIMELINE_RECORDS } from "@/lib/utils/timelineUtils";
import { JobsSummaryCards, TimelineNodeSection, LogSelector } from "@/components/pipelines/TimelineView";
import { Loader, RotateCcw, StopCircle, Download, ChevronLeft, FileCode } from "lucide-react";

type Tab = "uebersicht" | "log" | "artefakte";

/** Detailseite für einen einzelnen Build mit Abbruch-Option und Log-Darstellung. */
export default function BuildDetailPage({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = use(params);
  const buildIdNum = parseInt(buildId);
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [selectedLog, setSelectedLog] = useState<{ logId: number; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: build, isLoading, error } = useQuery({
    queryKey: ["build", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.getBuild(client, settings.project, buildIdNum) : Promise.reject(tBd("loadError")),
    enabled: !!client && !!settings,
    refetchInterval: (query) => (query.state.data?.status === "inProgress" ? 5000 : false),
  });

  const { data: timeline } = useQuery({
    queryKey: ["build-timeline", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.getBuildTimeline(client, settings.project, buildIdNum) : Promise.resolve({ records: [] }),
    enabled: !!client && !!settings && (activeTab === "uebersicht" || activeTab === "log"),
    refetchInterval: build?.status === "inProgress" ? 5000 : false,
  });

  const { data: artifacts } = useQuery({
    queryKey: ["build-artifacts", buildIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.getArtifacts(client, settings.project, buildIdNum) : Promise.resolve([]),
    enabled: !!client && !!settings && activeTab === "artefakte",
  });

  const { data: logContent, isLoading: logLoading } = useQuery({
    queryKey: ["build-log", buildIdNum, selectedLog?.logId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && selectedLog ? pipelinesService.getBuildLog(client, settings.project, buildIdNum, selectedLog.logId) : Promise.resolve(""),
    enabled: !!client && !!settings && !!selectedLog,
  });

  const timelineRecords = timeline?.records ?? EMPTY_TIMELINE_RECORDS;
  const timelineView = useMemo(() => buildTimelineView(timelineRecords), [timelineRecords]);
  const logRecords = useMemo(
    () => timelineRecords.filter((r) => r.type === "Task" && parseLogId(r) !== null).sort((a, b) => (a.order || 0) - (b.order || 0)),
    [timelineRecords]
  );

  const retryMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !build) return Promise.reject(new Error(tBd("loadError")));
      return pipelinesService.queueBuild(client, settings.project, build.definition.id, build.sourceBranch);
    },
    onSuccess: (newBuild) => { setActionError(null); qc.invalidateQueries({ queryKey: ["builds"] }); router.push(`/pipelines/${newBuild.id}`); },
    onError: (err: Error) => setActionError(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) return Promise.reject(new Error(tBd("loadError")));
      return pipelinesService.cancelBuild(client, settings.project, buildIdNum);
    },
    onSuccess: () => { setActionError(null); qc.invalidateQueries({ queryKey: ["build", buildIdNum] }); },
    onError: (err: Error) => setActionError(err.message),
  });

  const tBd = useTranslations("pipelines.buildDetail");
  const tPipelines = useTranslations("pipelines");
  const tc = useTranslations("common");
  const tBuildStatus = useTranslations("buildStatus");

  const PipelineBackLink = (
    <Link
      href="/pipelines"
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      {tPipelines("title")}
    </Link>
  );

  if (isLoading) return <div className="min-h-screen"><AppBar title={PipelineBackLink} hideProjectChip /><PageLoader /></div>;
  if (error || !build) return <div className="min-h-screen"><AppBar title={PipelineBackLink} hideProjectChip /><ErrorMessage message={tBd("loadError")} error={error} /></div>;

  const handleOpenLog = (logId: number, name: string) => { setSelectedLog({ logId, name }); setActiveTab("log"); };

  return (
    <div className="min-h-screen">
      <AppBar title={PipelineBackLink} hideProjectChip />

      {/* Build-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2 pt-4">
          <h1 className="text-base font-semibold text-slate-100 flex-1">{build.definition.name}</h1>
          <Badge variant={getBuildStatusVariant(build.result || build.status)}>{getBuildStatusLabel(build.result || build.status, tBuildStatus)}</Badge>
        </div>
        <p className="text-xs text-slate-400 font-mono mb-1">#{build.buildNumber}</p>
        <p className="text-xs text-slate-500">{stripRefPrefix(build.sourceBranch)} · {build.requestedBy.displayName}</p>
        <p className="text-xs text-slate-600 mt-1">{timeAgo(build.queueTime)}</p>

        <div className="flex gap-2 mt-3">
          {build.status === "completed" && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/30 hover:bg-blue-700/50 text-blue-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {retryMutation.isPending ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {tBd("restart")}
            </button>
          )}
          {build.status === "inProgress" && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700/30 hover:bg-red-700/50 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending ? <Loader size={12} className="animate-spin" /> : <StopCircle size={12} />}
              {tBd("cancel")}
            </button>
          )}
          <Link href={`/pipelines/${buildId}/yaml`}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/40 hover:bg-slate-700/70 text-slate-300 rounded-lg text-xs font-medium transition-colors">
              <FileCode size={12} />
              {tBd("editYaml")}
            </span>
          </Link>
        </div>
        {actionError && <p className="text-xs text-red-400 mt-2">{actionError}</p>}
      </div>

      <TabBar
        variant="underline"
        tabs={[
          { key: "uebersicht", label: tBd("overview") },
          { key: "log", label: tBd("logs") },
          { key: "artefakte", label: tBd("artifacts") },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as Tab)}
      />

      <div>
        {activeTab === "uebersicht" && (
          <div className="space-y-3 px-3 py-3">
            {timelineView.roots.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">{tBd("noTimeline")}</p>
            ) : (
              <>
                <JobsSummaryCards summary={timelineView.summary} />
                {timelineView.roots.map((rootNode) => (
                  <TimelineNodeSection key={rootNode.record.id} node={rootNode} depth={0} onOpenLog={handleOpenLog} />
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === "log" && (
          <div className="p-4">
            {!selectedLog ? (
              logRecords.length === 0 ? (
                <p className="text-sm text-slate-500">{tBd("noLogs")}</p>
              ) : (
                <LogSelector logRecords={logRecords} onSelect={(logId, name) => setSelectedLog({ logId, name })} />
              )
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BackActionButton onClick={() => setSelectedLog(null)} label={tc("back")} size="compact" />
                  <span className="text-xs text-slate-400">{selectedLog.name}</span>
                </div>
                {logLoading ? (
                  <PageLoader />
                ) : (
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto">
                    {logContent || tBd("noLogContent")}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "artefakte" && (
          <div className="p-4 space-y-2">
            {!artifacts?.length ? (
              <p className="text-sm text-slate-500 text-center py-6">{tBd("noArtifacts")}</p>
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
