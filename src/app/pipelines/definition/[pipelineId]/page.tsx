"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppBar } from "@/components/layout/AppBar";
import { StartPipelineModal } from "@/components/pipelines/StartPipelineModal";
import { BuildStatusIcon } from "@/components/ui/BuildStatusIndicator";
import { Badge } from "@/components/ui/Badge";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { getBuildStatusVariant, getBuildStatusLabel } from "@/lib/utils/timelineUtils";
import { stripRefPrefix } from "@/lib/utils/gitUtils";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { Pipeline } from "@/types";

/** Detailseite einer Pipeline-Definition mit letzten Runs und Start-Button. */
export default function PipelineDefinitionPage({ params }: { params: Promise<{ pipelineId: string }> }) {
  const { pipelineId } = use(params);
  const pipelineIdNum = parseInt(pipelineId);
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();
  const t = useTranslations("pipelines");
  const tBuildStatus = useTranslations("buildStatus");
  const tDef = useTranslations("pipelines.definition");

  const [startModal, setStartModal] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Alle Pipelines laden um den Namen der Definition zu ermitteln
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines", settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings ? pipelinesService.listPipelines(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const pipeline = pipelines?.find((p) => p.id === pipelineIdNum) ?? null;

  // Letzte Builds dieser Definition laden
  const { data: builds, isLoading: buildsLoading, error: buildsError } = useQuery({
    queryKey: ["builds-definition", pipelineIdNum, settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? pipelinesService.listBuilds(client, settings.project, [pipelineIdNum], 20)
        : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const startMutation = useMutation({
    mutationFn: ({ branchRef, params: buildParams }: { branchRef: string; params?: Record<string, string> }) => {
      if (!client || !settings) throw new Error(t("noClient"));
      return pipelinesService.queueBuild(
        client,
        settings.project,
        pipelineIdNum,
        branchRef,
        buildParams && Object.keys(buildParams).length > 0 ? buildParams : undefined
      );
    },
    onSuccess: (newBuild) => {
      setStartModal(false);
      setStartError(null);
      qc.invalidateQueries({ queryKey: ["builds-definition", pipelineIdNum] });
      qc.invalidateQueries({ queryKey: ["builds"] });
      router.push(`/pipelines/${newBuild.id}`);
    },
    onError: (err: Error) => setStartError(err.message),
  });

  // Dummy-Pipeline-Objekt fuer das Modal (braucht nur id und name)
  const pipelineForModal: Pipeline | null = pipeline ?? (pipelineIdNum ? { id: pipelineIdNum, name: tDef("title") } : null);

  const backLink = (
    <Link
      href="/pipelines"
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      {t("title")}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <AppBar
        title={backLink}
        hideProjectChip
        rightSlot={
          <button
            onClick={() => { setStartError(null); setStartModal(true); }}
            className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-600/10 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-600/20"
          >
            <Play size={13} />
            {t("start")}
          </button>
        }
      />

      {/* Pipeline-Kopfbereich */}
      <div className="px-4 pt-4 pb-4 border-b border-slate-800">
        <h1 className="text-base font-semibold text-slate-100">
          {pipeline?.name ?? `Pipeline #${pipelineId}`}
        </h1>
        {pipeline?.folder && pipeline.folder !== "\\" && (
          <p className="text-xs text-slate-500 mt-0.5 font-mono">{pipeline.folder}</p>
        )}
      </div>

      {/* Letzte Runs */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{tDef("recentRuns")}</p>
      </div>

      {buildsLoading ? (
        <PageLoader />
      ) : buildsError ? (
        <div className="px-4"><ErrorMessage message={t("loadError")} error={buildsError} /></div>
      ) : !builds?.length ? (
        <p className="px-4 py-6 text-sm text-slate-500 text-center">{tDef("noRuns")}</p>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {builds.map((build) => (
            <Link
              key={build.id}
              href={`/pipelines/${build.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-800/30"
            >
              <BuildStatusIcon status={build.result ?? build.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">#{build.buildNumber}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stripRefPrefix(build.sourceBranch)} · {timeAgo(build.queueTime)}
                </p>
              </div>
              <Badge variant={getBuildStatusVariant(build.result ?? build.status)}>
                {getBuildStatusLabel(build.result ?? build.status, tBuildStatus)}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {startModal && pipelineForModal && (
        <StartPipelineModal
          open={startModal}
          pipeline={pipelineForModal}
          isPending={startMutation.isPending}
          error={startError}
          client={client}
          project={settings?.project ?? ""}
          onClose={() => { setStartModal(false); setStartError(null); }}
          onStart={(branchRef, params) => startMutation.mutate({ branchRef, params })}
        />
      )}
    </div>
  );
}
