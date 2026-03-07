"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { usePipelineDefStore } from "@/lib/stores/selectionStore";
import { PipelineSelector } from "@/components/layout/selectors/PipelineSelector";
import { DeliveryTitleSelector } from "@/components/layout/DeliveryTitleSelector";
import { Pipeline } from "@/types";
import { PlayCircle, ChevronRight, Play, StopCircle } from "lucide-react";

export default function PipelinesPage() {
  const [view, setView] = useState<"pipelines" | "builds">("builds");
  const [startModal, setStartModal] = useState<Pipeline | null>(null);
  const [startBranch, setStartBranch] = useState("main");

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();

  // Ausgewaehlte Pipeline-Definitionen aus dem Tab-spezifischen Store
  const { selectedIds: selectedDefIds } = usePipelineDefStore();
  // String-IDs in Zahlen umwandeln fuer den API-Aufruf
  const selectedDefNumbers = selectedDefIds.map(Number).filter(Boolean);

  // Pipeline-Definitionen laden (fuer Selektor + Definitionen-Tab)
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines", settings?.project, settings?.demoMode],
    queryFn: () => client && settings ? pipelinesService.listPipelines(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Builds laden – gefiltert nach ausgewaehlten Pipeline-Definitionen
  const { data: builds, isLoading: buildsLoading, error: buildsError, refetch } = useQuery({
    // Query-Key enthaelt Definition-IDs damit React Query bei Aenderung neu laedt
    queryKey: ["builds", selectedDefNumbers, settings?.project, settings?.demoMode],
    queryFn: async () => {
      if (!client || !settings) return [];
      // Bei Auswahl: direkt mit definitionIds-Filter, sonst alle laden
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

  // Build starten
  const startMutation = useMutation({
    mutationFn: (pipeline: Pipeline) =>
      client && settings
        ? pipelinesService.queueBuild(client, settings.project, pipeline.id, `refs/heads/${startBranch}`)
        : Promise.reject(new Error("Kein Client")),
    onSuccess: () => {
      setStartModal(null);
      qc.invalidateQueries({ queryKey: ["builds", selectedDefNumbers] });
    },
  });

  // Build abbrechen
  const cancelMutation = useMutation({
    mutationFn: (buildId: number) =>
      client && settings
        ? pipelinesService.cancelBuild(client, settings.project, buildId)
        : Promise.reject(new Error("Kein Client")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["builds", selectedDefNumbers] }),
  });

  return (
    <div className="min-h-screen">
      <AppBar title={<DeliveryTitleSelector current="pipelines" />} rightSlot={<PipelineSelector pipelines={pipelines || []} loading={pipelinesLoading} />} />

      {/* View-Tabs */}
      <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
        <div className="flex gap-2">
          {[
            { key: "builds", label: "Runs" },
            { key: "pipelines", label: "Definitionen" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key as "pipelines" | "builds")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                view === key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline-Definitionen */}
      <div className="pt-[3.85rem]">
        {view === "pipelines" && (
          <div>
            {pipelinesLoading ? (
              <PageLoader />
            ) : !pipelines?.length ? (
              <EmptyState icon={PlayCircle} title="Keine Pipelines gefunden" />
            ) : (
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
                      onClick={() => { setStartModal(pipeline); setStartBranch("main"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Play size={12} />
                      Starten
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Build-Runs */}
        {view === "builds" && (
          <div>
            {buildsLoading ? (
              <PageLoader />
            ) : buildsError ? (
              <ErrorMessage message="Builds konnten nicht geladen werden" onRetry={refetch} />
            ) : !builds?.length ? (
              <EmptyState icon={PlayCircle} title="Keine Builds gefunden" />
            ) : (
              <div className="divide-y divide-slate-800/50">
                {builds.map((build) => (
                  <Link
                    key={build.id}
                    href={`/pipelines/${build.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors"
                  >
                    <BuildStatusIcon status={build.result || build.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{build.definition.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">#{build.buildNumber}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500 truncate">{build.sourceBranch.replace("refs/heads/", "")}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDistanceToNow(new Date(build.queueTime), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Laufenden Build abbrechen */}
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
            )}
          </div>
        )}
      </div>

      {/* Pipeline starten Modal */}
      <Modal open={!!startModal} onClose={() => setStartModal(null)} title="Pipeline starten">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">{startModal?.name}</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Branch</label>
            <input
              type="text"
              value={startBranch}
              onChange={(e) => setStartBranch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              placeholder="main"
            />
          </div>
          {startMutation.isError && (
            <p className="text-sm text-red-400">{(startMutation.error as Error).message}</p>
          )}
          <Button fullWidth loading={startMutation.isPending} onClick={() => startModal && startMutation.mutate(startModal)}>
            <Play size={16} />
            Pipeline starten
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setStartModal(null)}>Abbrechen</Button>
        </div>
      </Modal>
    </div>
  );
}

// Build-Status-Icon
function BuildStatusIcon({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; pulse?: boolean }> = {
    succeeded: { bg: "bg-green-500/20", text: "text-green-400" },
    failed: { bg: "bg-red-500/20", text: "text-red-400" },
    canceled: { bg: "bg-slate-500/20", text: "text-slate-400" },
    inProgress: { bg: "bg-blue-500/20", text: "text-blue-400", pulse: true },
    partiallySucceeded: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    none: { bg: "bg-slate-700/30", text: "text-slate-500" },
  };
  const config = configs[status] || configs.none;
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
      <div className={`w-2.5 h-2.5 rounded-full bg-current ${config.text} ${config.pulse ? "animate-pulse" : ""}`} />
    </div>
  );
}
