"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Play, PlayCircle, Plus, StopCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppBar } from "@/components/layout/AppBar";
import { DeliveryTitleSelector } from "@/components/layout/DeliveryTitleSelector";
import { PipelineSelector } from "@/components/layout/selectors/PipelineSelector";
import { CreatePipelineModal } from "@/components/pipelines/CreatePipelineModal";
import { StartPipelineModal } from "@/components/pipelines/StartPipelineModal";
import { BuildStatusIcon } from "@/components/ui/BuildStatusIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { TabBar } from "@/components/ui/TabBar";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { usePipelineDefStore } from "@/lib/stores/selectionStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { usePipelineCreationStore } from "@/lib/stores/pipelineCreationStore";
import { stripRefPrefix } from "@/lib/utils/gitUtils";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { Pipeline } from "@/types";

/** Haupt-Seite für Pipelines und Builds mit Start- und Abbruch-Aktionen. */
export default function PipelinesPage() {
  const [view, setView] = useState<"pipelines" | "builds">("builds");
  const [startModal, setStartModal] = useState<Pipeline | null>(null);
  const [createModal, setCreateModal] = useState(false);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();
  const router = useRouter();
  const { clearDraft, clearFlashMessage, flashMessage, setDraft } = usePipelineCreationStore();
  const t = useTranslations("pipelines");

  const { selectedIds: selectedDefIds } = usePipelineDefStore();
  const selectedDefNumbers = selectedDefIds.map(Number).filter(Boolean);
  const activeView = flashMessage || createModal ? "pipelines" : view;

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines", settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings ? pipelinesService.listPipelines(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const { data: builds, isLoading: buildsLoading, error: buildsError, refetch } = useQuery({
    queryKey: ["builds", selectedDefNumbers, settings?.project, settings?.demoMode],
    queryFn: async () => {
      if (!client || !settings) return [];
      return pipelinesService.listBuilds(
        client,
        settings.project,
        selectedDefNumbers.length > 0 ? selectedDefNumbers : undefined,
        30
      );
    },
    enabled: !!client && !!settings,
    refetchInterval: 15000,
  });

  const { data: pipelineFolders = [] } = useQuery({
    queryKey: ["pipeline-folders", settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings ? pipelinesService.listPipelineFolders(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings && createModal,
    staleTime: 10 * 60 * 1000,
  });

  const { data: repositories } = useQuery({
    queryKey: ["repositories", settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings ? repositoriesService.listRepositories(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings && createModal,
    staleTime: 5 * 60 * 1000,
  });

  const startMutation = useMutation({
    mutationFn: ({
      definitionId,
      branchRef,
      params,
    }: {
      definitionId: number;
      branchRef: string;
      params?: Record<string, string>;
    }) => {
      if (!client || !settings) throw new Error(t("noClient"));
      return pipelinesService.queueBuild(
        client,
        settings.project,
        definitionId,
        branchRef,
        Object.keys(params || {}).length > 0 ? params : undefined
      );
    },
    onSuccess: () => {
      setStartModal(null);
      qc.invalidateQueries({ queryKey: ["builds", selectedDefNumbers] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (buildId: number) =>
      client && settings
        ? pipelinesService.cancelBuild(client, settings.project, buildId)
        : Promise.reject(new Error(t("noClient"))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["builds", selectedDefNumbers] }),
  });

  useEffect(() => {
    if (!flashMessage) return;
    const timeoutId = window.setTimeout(() => {
      clearFlashMessage();
    }, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [clearFlashMessage, flashMessage]);

  return (
    <div className="min-h-screen">
      <AppBar
        title={<DeliveryTitleSelector current="pipelines" />}
        rightSlot={<PipelineSelector pipelines={pipelines || []} loading={pipelinesLoading} />}
      />

      <TabBar
        tabs={[{ key: "builds", label: t("runs") }, { key: "pipelines", label: t("definitions") }]}
        activeKey={activeView}
        onChange={(key) => setView(key as "pipelines" | "builds")}
      />

      <div className="pt-[3.85rem]">
        {flashMessage && (
          <div className="px-4 pt-2">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                flashMessage.tone === "success"
                  ? "border-green-700/40 bg-green-900/20 text-green-300"
                  : flashMessage.tone === "warning"
                    ? "border-yellow-700/40 bg-yellow-900/20 text-yellow-300"
                    : "border-blue-700/40 bg-blue-900/20 text-blue-200"
              }`}
            >
              {flashMessage.text}
            </div>
          </div>
        )}

        {activeView === "pipelines" &&
          (pipelinesLoading ? (
            <PageLoader />
          ) : !pipelines?.length ? (
            <EmptyState icon={PlayCircle} title={t("noPipelinesFound")} />
          ) : (
            <div className="divide-y divide-slate-800/50">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{pipeline.name}</p>
                    {pipeline.folder && pipeline.folder !== "\\" && (
                      <p className="text-xs text-slate-500">{pipeline.folder}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      startMutation.reset();
                      setStartModal(pipeline);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-green-700/30 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-700/50"
                  >
                    <Play size={12} />
                    {t("start")}
                  </button>
                </div>
              ))}
            </div>
          ))}

        {activeView === "builds" &&
          (buildsLoading ? (
            <PageLoader />
          ) : buildsError ? (
            <ErrorMessage message={t("loadError")} error={buildsError} onRetry={refetch} />
          ) : !builds?.length ? (
            <EmptyState icon={PlayCircle} title={t("noBuildsFound")} />
          ) : (
            <div>
              <div className="divide-y divide-slate-800/50">
                {builds.map((build) => (
                  <Link
                    key={build.id}
                    href={`/pipelines/${build.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-800/30"
                  >
                    <BuildStatusIcon status={build.result || build.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{build.definition.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-xs text-slate-500">#{build.buildNumber}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="truncate text-xs text-slate-500">
                          {stripRefPrefix(build.sourceBranch)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{timeAgo(build.queueTime)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {build.status === "inProgress" && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            cancelMutation.mutate(build.id);
                          }}
                          className="rounded-lg p-1.5 hover:bg-slate-700"
                        >
                          <StopCircle size={16} className="text-red-400" />
                        </button>
                      )}
                      <ChevronRight size={16} className="text-slate-600" />
                    </div>
                  </Link>
                ))}
              </div>
              {cancelMutation.isError && (
                <div className="px-4 pb-1 pt-2">
                  <p className="text-sm text-red-400">{(cancelMutation.error as Error).message}</p>
                </div>
              )}
            </div>
          ))}
      </div>

      {activeView === "pipelines" && (
        <button
          onClick={() => {
            clearDraft();
            setCreateModal(true);
          }}
          className="fixed right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-900/40 transition-colors hover:bg-blue-500"
          style={{ bottom: "var(--fab-bottom-offset)" }}
        >
          <Plus size={18} />
          {t("newPipeline")}
        </button>
      )}

      {createModal && (
        <CreatePipelineModal
          open={createModal}
          repositories={repositories}
          pipelineFolders={pipelineFolders}
          onClose={() => {
            clearDraft();
            setCreateModal(false);
          }}
          onStartEditor={(nextDraft) => {
            setDraft(nextDraft);
            setCreateModal(false);
            router.push("/pipelines/new/yaml");
          }}
        />
      )}

      <StartPipelineModal
        open={!!startModal}
        pipeline={startModal}
        isPending={startMutation.isPending}
        error={startMutation.error ? (startMutation.error as Error).message : null}
        onClose={() => {
          if (!startMutation.isPending) {
            startMutation.reset();
            setStartModal(null);
          }
        }}
        onStart={(branchRef, params) =>
          startModal && startMutation.mutate({ definitionId: startModal.id, branchRef, params })
        }
      />
    </div>
  );
}
