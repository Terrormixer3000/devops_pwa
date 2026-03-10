"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabBar } from "@/components/ui/TabBar";
import { BuildStatusIcon } from "@/components/ui/BuildStatusIndicator";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { usePipelineDefStore } from "@/lib/stores/selectionStore";
import { PipelineSelector } from "@/components/layout/selectors/PipelineSelector";
import { DeliveryTitleSelector } from "@/components/layout/DeliveryTitleSelector";
import { StartPipelineModal } from "@/components/pipelines/StartPipelineModal";
import { CreatePipelineModal } from "@/components/pipelines/CreatePipelineModal";
import { timeAgo } from "@/lib/utils/timeAgo";
import { stripRefPrefix } from "@/lib/utils/gitUtils";
import { usePipelineCreationStore } from "@/lib/stores/pipelineCreationStore";
import type { Pipeline } from "@/types";
import { PlayCircle, ChevronRight, Play, StopCircle, Plus } from "lucide-react";

/** Haupt-Seite für Pipelines und Builds mit Start- und Abbruch-Aktionen. */
export default function PipelinesPage() {
  const [view, setView] = useState<"pipelines" | "builds">("builds");
  const [startModal, setStartModal] = useState<Pipeline | null>(null);
  const [createModal, setCreateModal] = useState(false);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();
  const router = useRouter();
  const {
    clearDraft,
    clearFlashMessage,
    consumeCreateModalResume,
    draft,
    flashMessage,
    resumeCreateModal,
    setDraft,
  } = usePipelineCreationStore();

  const { selectedIds: selectedDefIds } = usePipelineDefStore();
  const selectedDefNumbers = selectedDefIds.map(Number).filter(Boolean);
  const isCreateModalOpen = createModal || resumeCreateModal;
  const activeView = flashMessage || isCreateModalOpen ? "pipelines" : view;

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines", settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.listPipelines(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const { data: builds, isLoading: buildsLoading, error: buildsError, refetch } = useQuery({
    queryKey: ["builds", selectedDefNumbers, settings?.project, settings?.demoMode],
    queryFn: async () => {
      if (!client || !settings) return [];
      return pipelinesService.listBuilds(client, settings.project, selectedDefNumbers.length > 0 ? selectedDefNumbers : undefined, 30);
    },
    enabled: !!client && !!settings,
    refetchInterval: 15000,
  });

  const { data: pipelineFolders = [] } = useQuery({
    queryKey: ["pipeline-folders", settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.listPipelineFolders(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings && isCreateModalOpen,
    staleTime: 10 * 60 * 1000,
  });

  const { data: repositories } = useQuery({
    queryKey: ["repositories", settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? repositoriesService.listRepositories(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings && isCreateModalOpen,
    staleTime: 5 * 60 * 1000,
  });

  const createPipelineMutation = useMutation({
    mutationFn: (data: { name: string; folder: string; yamlPath: string; repositoryId: string; repositoryName: string }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pipelinesService.createPipeline(client, settings.project, data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["pipelines"] });
      await qc.invalidateQueries({ queryKey: ["pipeline-folders"] });
      consumeCreateModalResume();
      clearDraft();
      setCreateModal(false);
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ definitionId, branchRef, params }: { definitionId: number; branchRef: string; params?: Record<string, string> }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pipelinesService.queueBuild(client, settings.project, definitionId, branchRef, Object.keys(params || {}).length > 0 ? params : undefined);
    },
    onSuccess: () => { setStartModal(null); qc.invalidateQueries({ queryKey: ["builds", selectedDefNumbers] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: (buildId: number) => client && settings ? pipelinesService.cancelBuild(client, settings.project, buildId) : Promise.reject(new Error("Kein Client")),
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
      <AppBar title={<DeliveryTitleSelector current="pipelines" />} rightSlot={<PipelineSelector pipelines={pipelines || []} loading={pipelinesLoading} />} />

      <TabBar
        tabs={[{ key: "builds", label: "Runs" }, { key: "pipelines", label: "Definitionen" }]}
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

        {activeView === "pipelines" && (
          pipelinesLoading ? <PageLoader /> : !pipelines?.length ? <EmptyState icon={PlayCircle} title="Keine Pipelines gefunden" /> : (
            <div className="divide-y divide-slate-800/50">
              {pipelines.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{pipeline.name}</p>
                    {pipeline.folder && pipeline.folder !== "\\" && (
                      <p className="text-xs text-slate-500">{pipeline.folder}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { startMutation.reset(); setStartModal(pipeline); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Play size={12} />
                    Starten
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeView === "builds" && (
          buildsLoading ? <PageLoader /> : buildsError ? (
            <ErrorMessage message="Builds konnten nicht geladen werden" error={buildsError} onRetry={refetch} />
          ) : !builds?.length ? <EmptyState icon={PlayCircle} title="Keine Builds gefunden" /> : (
            <div>
              <div className="divide-y divide-slate-800/50">
                {builds.map((build) => (
                  <Link key={build.id} href={`/pipelines/${build.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors">
                    <BuildStatusIcon status={build.result || build.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{build.definition.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">#{build.buildNumber}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500 truncate">{stripRefPrefix(build.sourceBranch)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{timeAgo(build.queueTime)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {build.status === "inProgress" && (
                        <button
                          onClick={(e) => { e.preventDefault(); cancelMutation.mutate(build.id); }}
                          className="p-1.5 hover:bg-slate-700 rounded-lg"
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
                <div className="px-4 pt-2 pb-1">
                  <p className="text-sm text-red-400">{(cancelMutation.error as Error).message}</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {activeView === "pipelines" && (
        <button
          onClick={() => { createPipelineMutation.reset(); setCreateModal(true); }}
          className="fixed right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 text-sm font-medium transition-colors"
          style={{ bottom: "var(--fab-bottom-offset)" }}
        >
          <Plus size={18} />
          Neue Pipeline
        </button>
      )}

      {isCreateModalOpen && (
        <CreatePipelineModal
          open={isCreateModalOpen}
          isPending={createPipelineMutation.isPending}
          error={createPipelineMutation.error ? (createPipelineMutation.error as Error).message : null}
          repositories={repositories}
          pipelineFolders={pipelineFolders}
          initialDraft={draft}
          onClose={() => {
            createPipelineMutation.reset();
            consumeCreateModalResume();
            clearDraft();
            setCreateModal(false);
          }}
          onSubmit={(data) => createPipelineMutation.mutate(data)}
          onStartEditor={(nextDraft) => {
            createPipelineMutation.reset();
            consumeCreateModalResume();
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
        onClose={() => { if (!startMutation.isPending) { startMutation.reset(); setStartModal(null); } }}
        onStart={(branchRef, params) => startModal && startMutation.mutate({ definitionId: startModal.id, branchRef, params })}
      />
    </div>
  );
}
