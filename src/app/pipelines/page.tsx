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
import { PlayCircle, ChevronRight, Play, StopCircle, GitBranch, Info, Plus, X } from "lucide-react";

const QUICK_BRANCHES = ["main", "develop", "release/2026.03", "hotfix/urgent-fix"];

interface PipelineParam {
  key: string;
  value: string;
}

function normalizeBranchInput(branch: string): string {
  return branch.replace(/^refs\/heads\//, "").trim();
}

function getBranchValidationError(branch: string): string | null {
  if (!branch) return "Bitte einen Branch-Namen eingeben.";
  if (branch.startsWith("/") || branch.endsWith("/")) return "Branch darf nicht mit / starten oder enden.";
  if (branch.endsWith(".") || branch.endsWith(".lock")) return "Branch endet mit einem ungueltigen Suffix.";
  if (branch.includes(" ") || branch.includes("..") || branch.includes("//")) return "Branch enthaelt ungueltige Zeichen.";
  if (branch.includes("@{") || branch.includes("\\")) return "Branch-Format ist ungueltig.";
  return null;
}

export default function PipelinesPage() {
  const [view, setView] = useState<"pipelines" | "builds">("builds");
  const [startModal, setStartModal] = useState<Pipeline | null>(null);
  const [startBranch, setStartBranch] = useState("main");
  const [pipelineParams, setPipelineParams] = useState<PipelineParam[]>([]);

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
    mutationFn: (pipeline: Pipeline) => {
      const normalizedBranch = normalizeBranchInput(startBranch);
      const branchError = getBranchValidationError(normalizedBranch);
      if (branchError) return Promise.reject(new Error(branchError));

      // Parameter-Map aus Key-Value-Paaren erstellen (leere ueberspringen)
      const paramMap: Record<string, string> = {};
      for (const p of pipelineParams) {
        if (p.key.trim()) paramMap[p.key.trim()] = p.value;
      }
      const hasParams = Object.keys(paramMap).length > 0;

      return client && settings
        ? pipelinesService.queueBuild(client, settings.project, pipeline.id, `refs/heads/${normalizedBranch}`, hasParams ? paramMap : undefined)
        : Promise.reject(new Error("Kein Client"));
    },
    onSuccess: () => {
      setStartModal(null);
      setStartBranch("main");
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

  const normalizedStartBranch = normalizeBranchInput(startBranch);
  const startBranchError = getBranchValidationError(normalizedStartBranch);
  const startBranchRef = normalizedStartBranch ? `refs/heads/${normalizedStartBranch}` : "";
  const canStartPipeline = !!startModal && !startBranchError && !startMutation.isPending;

  const openStartDialog = (pipeline: Pipeline) => {
    startMutation.reset();
    setStartModal(pipeline);
    setStartBranch("main");
    setPipelineParams([]);
  };

  const closeStartDialog = () => {
    if (startMutation.isPending) return;
    startMutation.reset();
    setStartModal(null);
    setStartBranch("main");
    setPipelineParams([]);
  };

  const handleStartPipeline = () => {
    if (!startModal || startBranchError) return;
    startMutation.mutate(startModal);
  };

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
                      onClick={() => openStartDialog(pipeline)}
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
      <Modal open={!!startModal} onClose={closeStartDialog} title="Pipeline starten">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/45 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Definition</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-100">{startModal?.name}</p>
            {startModal?.folder && startModal.folder !== "\\" ? (
              <p className="mt-1 text-xs text-slate-500">{startModal.folder}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Branch</label>
            <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/60">
              <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2 text-[11px] text-slate-500">
                <GitBranch size={13} />
                <span className="font-mono">refs/heads/</span>
              </div>
              <input
                type="text"
                value={startBranch}
                onChange={(event) => setStartBranch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canStartPipeline) {
                    event.preventDefault();
                    handleStartPipeline();
                  }
                }}
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                placeholder="main"
                autoFocus
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_BRANCHES.map((branch) => (
                <button
                  key={branch}
                  type="button"
                  onClick={() => setStartBranch(branch)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    normalizedStartBranch === branch
                      ? "border-blue-400/70 bg-blue-600/20 text-blue-300"
                      : "border-slate-700 bg-slate-800/70 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {branch}
                </button>
              ))}
            </div>

            {startBranchError ? (
              <p className="text-xs text-red-400">{startBranchError}</p>
            ) : (
              <p className="text-xs text-slate-500">
                Ziel-Ref: <span className="font-mono text-slate-300">{startBranchRef}</span>
              </p>
            )}
          </div>

          {/* Pipeline-Parameter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Parameter</label>
              <button
                type="button"
                onClick={() => setPipelineParams((prev) => [...prev, { key: "", value: "" }])}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus size={12} />
                Hinzufuegen
              </button>
            </div>
            {pipelineParams.length === 0 ? (
              <p className="text-xs text-slate-600">Keine Parameter gesetzt</p>
            ) : (
              <div className="space-y-2">
                {pipelineParams.map((param, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => setPipelineParams((prev) => prev.map((p, j) => j === i ? { ...p, key: e.target.value } : p))}
                      placeholder="Name"
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => setPipelineParams((prev) => prev.map((p, j) => j === i ? { ...p, value: e.target.value } : p))}
                      placeholder="Wert"
                      className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPipelineParams((prev) => prev.filter((_, j) => j !== i))}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5">
            <p className="flex items-start gap-2 text-xs text-blue-200">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-300" />
              Der Run startet sofort mit dem Branch-Stand und den angegebenen Parametern.
            </p>
          </div>

          {startMutation.isError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <p className="text-sm text-red-300">{(startMutation.error as Error).message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={closeStartDialog}
              disabled={startMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              className="flex-1"
              loading={startMutation.isPending}
              disabled={!canStartPipeline}
              onClick={handleStartPipeline}
            >
              <Play size={16} />
              Jetzt starten
            </Button>
          </div>
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
