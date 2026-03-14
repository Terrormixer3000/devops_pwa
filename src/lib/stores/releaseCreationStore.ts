import { create } from "zustand";
import type { ReleaseStageConfig, WorkflowTask } from "@/types";

/** Artifact-Quelle fuer eine Release-Pipeline (Build-Pipeline). */
export interface ReleaseArtifactConfig {
  definitionId: number;
  definitionName: string;
  projectId: string;
  projectName: string;
}

/** Gesamter Draft-Zustand fuer die Release-Pipeline-Erstellung. */
export interface ReleaseDraft {
  name: string;
  description: string;
  releaseNameFormat: string;
  stages: ReleaseStageConfig[];
  artifact: ReleaseArtifactConfig | null;
}

interface ReleaseCreationState {
  draft: ReleaseDraft | null;
  setDraft: (draft: ReleaseDraft) => void;
  patchDraft: (patch: Partial<ReleaseDraft>) => void;
  clearDraft: () => void;
  /** Ersetzt eine einzelne Stage anhand ihres Index. */
  updateStage: (index: number, stage: ReleaseStageConfig) => void;
  /** Fuegt eine neue Stage am Ende ein. */
  addStage: (stage: ReleaseStageConfig) => void;
  /** Entfernt eine Stage anhand ihres Index. */
  removeStage: (index: number) => void;
  /** Aktualisiert die Tasks einer Stage. */
  updateStageTasks: (stageIndex: number, tasks: WorkflowTask[]) => void;
}

/** In-Memory-Draft fuer den Release-Pipeline-Erstellungs-Flow ueber mehrere Seiten. */
export const useReleaseCreationStore = create<ReleaseCreationState>((set) => ({
  draft: null,

  setDraft: (draft) => set({ draft }),

  patchDraft: (patch) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...patch } : state.draft,
    })),

  clearDraft: () => set({ draft: null }),

  updateStage: (index, stage) =>
    set((state) => {
      if (!state.draft) return state;
      const stages = state.draft.stages.map((s, i) => (i === index ? stage : s));
      return { draft: { ...state.draft, stages } };
    }),

  addStage: (stage) =>
    set((state) => {
      if (!state.draft) return state;
      return { draft: { ...state.draft, stages: [...state.draft.stages, stage] } };
    }),

  removeStage: (index) =>
    set((state) => {
      if (!state.draft) return state;
      const stages = state.draft.stages.filter((_, i) => i !== index);
      return { draft: { ...state.draft, stages } };
    }),

  updateStageTasks: (stageIndex, tasks) =>
    set((state) => {
      if (!state.draft) return state;
      const stages = state.draft.stages.map((s, i) => (i === stageIndex ? { ...s, tasks } : s));
      return { draft: { ...state.draft, stages } };
    }),
}));
