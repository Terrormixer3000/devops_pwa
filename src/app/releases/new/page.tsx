"use client";

/**
 * Hauptseite zum Erstellen einer neuen Classic Release-Pipeline-Definition.
 * Stages werden als tappbare Karten angezeigt; der Zustand wird im
 * releaseCreationStore gehalten und ueber mehrere Unterseiten geteilt.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ChevronRight, Plus, Rocket, Trash2 } from "lucide-react";
import { AppBar } from "@/components/layout/AppBar";
import { BackActionButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { releasesService } from "@/lib/services/releasesService";
import { useReleaseCreationStore, type ReleaseDraft } from "@/lib/stores/releaseCreationStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { extractErrorMessage } from "@/lib/utils/errorUtils";
import type { ReleaseStageConfig } from "@/types";

/** Standard-Draft fuer eine neue Release-Pipeline. */
function buildDefaultDraft(): ReleaseDraft {
  return {
    name: "",
    description: "",
    releaseNameFormat: "Release-$(rev:r)",
    stages: [
      {
        name: "Production",
        agentSpec: "ubuntu-latest",
        tasks: [],
        preApprovals: { isAutomated: true, approvers: [] },
        postApprovals: { isAutomated: true, approvers: [] },
      },
    ],
    artifact: null,
  };
}

/** Hauptseite der Release-Pipeline-Erstellung. */
export default function NewReleasePipelinePage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { client, vsrmClient } = useAzureClient();

  const { draft, setDraft, patchDraft, clearDraft, removeStage } = useReleaseCreationStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Draft beim ersten Laden initialisieren (falls noch keiner existiert)
  useEffect(() => {
    if (!draft) setDraft(buildDefaultDraft());
  }, [draft, setDraft]);

  // Build-Pipelines laden fuer Artifact-Auswahl
  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines", settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings ? pipelinesService.listPipelines(client, settings.project) : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!vsrmClient || !settings || !draft) throw new Error("Kein Client");
      return releasesService.createDefinition(vsrmClient, settings.project, {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        stages: draft.stages,
        releaseNameFormat: draft.releaseNameFormat.trim() || "Release-$(rev:r)",
        artifact: draft.artifact ?? undefined,
      });
    },
    onSuccess: (created) => {
      clearDraft();
      router.push(`/releases?created=${encodeURIComponent(created.name)}`);
    },
    onError: (error) => {
      setSubmitError(extractErrorMessage(error, "Release-Pipeline konnte nicht erstellt werden."));
    },
  });

  const handleNavigateBack = () => {
    clearDraft();
    router.push("/releases");
  };

  const isInvalid =
    !draft ||
    !draft.name.trim() ||
    draft.stages.length === 0 ||
    draft.stages.some((s) => !s.name.trim());

  if (!draft) {
    return (
      <div className="min-h-screen">
        <AppBar title="Neue Release-Pipeline" />
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppBar title="Neue Release-Pipeline" />

      <div className="mx-auto max-w-2xl space-y-5 px-4 pb-8 pt-[calc(var(--app-bar-height)+1rem)]">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <BackActionButton
            onClick={handleNavigateBack}
            label="Releases"
            disabled={createMutation.isPending}
          />
          <Button
            onClick={() => {
              setSubmitError(null);
              createMutation.mutate();
            }}
            disabled={isInvalid || createMutation.isPending}
            loading={createMutation.isPending}
          >
            <Rocket size={16} />
            Erstellen
          </Button>
        </div>

        {/* Fehleranzeige */}
        {submitError && (
          <div className="rounded-2xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {submitError}
          </div>
        )}

        {/* Grundeinstellungen */}
        <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-800/45 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Allgemein</p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => patchDraft({ name: e.target.value })}
              placeholder="Meine Release-Pipeline"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Beschreibung <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => patchDraft({ description: e.target.value })}
              placeholder="Kurze Beschreibung der Pipeline"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Release-Namensformat <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={draft.releaseNameFormat}
              onChange={(e) => patchDraft({ releaseNameFormat: e.target.value })}
              placeholder="Release-$(rev:r)"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Artifact-Auswahl */}
        <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/45 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Artifact</p>
          <p className="text-xs text-slate-500">
            Build-Pipeline als Quelle verknüpfen <span className="text-slate-600">(optional)</span>
          </p>

          {pipelinesLoading ? (
            <PageLoader />
          ) : (
            <div className="max-h-44 divide-y divide-slate-700/50 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800/60">
              <button
                type="button"
                onClick={() => patchDraft({ artifact: null })}
                className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                  draft.artifact === null
                    ? "bg-slate-600/30 text-slate-300"
                    : "text-slate-500 hover:bg-slate-700/40"
                }`}
              >
                Kein Artifact
              </button>
              {(pipelines ?? []).map((pipeline) => (
                <button
                  key={pipeline.id}
                  type="button"
                  onClick={() =>
                    patchDraft({
                      artifact:
                        draft.artifact?.definitionId === pipeline.id
                          ? null
                          : {
                              definitionId: pipeline.id,
                              definitionName: pipeline.name,
                              projectId: pipeline.project?.id ?? "",
                              projectName: pipeline.project?.name ?? settings?.project ?? "",
                            },
                    })
                  }
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    draft.artifact?.definitionId === pipeline.id
                      ? "bg-purple-600/20 text-purple-300"
                      : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  <span className="block truncate">{pipeline.name}</span>
                  {pipeline.folder && pipeline.folder !== "\\" && (
                    <span className="block truncate text-xs text-slate-500">{pipeline.folder}</span>
                  )}
                </button>
              ))}
              {!pipelines?.length && (
                <p className="px-3 py-2.5 text-sm text-slate-500">Keine Pipelines gefunden</p>
              )}
            </div>
          )}
        </div>

        {/* Stage-Liste */}
        <div className="space-y-2 rounded-2xl border border-slate-700/60 bg-slate-800/45 p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Stages</p>

          <div className="space-y-1">
            {draft.stages.map((stage, index) => (
              <div key={index}>
                <StageCard
                  stage={stage}
                  index={index}
                  canRemove={draft.stages.length > 1}
                  onConfigure={() => router.push(`/releases/new/stage?index=${index}`)}
                  onRemove={() => removeStage(index)}
                />
                {index < draft.stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown size={16} className="text-slate-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stage hinzufügen → Template-Picker */}
          <button
            type="button"
            onClick={() => router.push("/releases/new/template")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 py-2.5 text-sm text-slate-400 transition-colors hover:border-purple-500/60 hover:text-purple-400"
          >
            <Plus size={15} />
            Stage hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stage-Karten-Komponente ──────────────────────────────────────────────────

interface StageCardProps {
  stage: ReleaseStageConfig;
  index: number;
  canRemove: boolean;
  onConfigure: () => void;
  onRemove: () => void;
}

/** Tappbare Vorschau-Karte einer Stage. */
function StageCard({ stage, canRemove, onConfigure, onRemove }: StageCardProps) {
  const taskCount = stage.tasks.length;
  const preAuto = stage.preApprovals.isAutomated;
  const postAuto = stage.postApprovals.isAutomated;
  const hasManualApproval = !preAuto || !postAuto;

  return (
    <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/60">
      <button
        type="button"
        onClick={onConfigure}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-700/30"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">
            {stage.name || <span className="text-slate-500 italic">Unbenannte Stage</span>}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {stage.agentSpec}
            {taskCount > 0 && ` · ${taskCount} Task${taskCount !== 1 ? "s" : ""}`}
          </p>
          <p className={`mt-0.5 text-xs ${hasManualApproval ? "text-yellow-500" : "text-slate-600"}`}>
            {hasManualApproval ? "Manuelle Approvals" : "Auto-Approvals"}
          </p>
        </div>
        <ChevronRight size={16} className="flex-shrink-0 text-slate-600" />
      </button>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="px-3 py-3 text-slate-600 transition-colors hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
