import { create } from "zustand";

export type PipelineYamlEntryMode = "existing-yaml" | "new-yaml";

export interface PipelineCreationFlashMessage {
  tone: "success" | "info" | "warning";
  text: string;
}

export interface PipelineCreationDraft {
  name: string;
  folder: string;
  yamlPath: string;
  repositoryId: string;
  repositoryName: string;
  defaultBranch: string;
  entryMode: PipelineYamlEntryMode;
  editorContent: string;
  fileExistsOnDefaultBranch: boolean | null;
}

interface PipelineCreationState {
  draft: PipelineCreationDraft | null;
  resumeCreateModal: boolean;
  flashMessage: PipelineCreationFlashMessage | null;
  setDraft: (draft: PipelineCreationDraft) => void;
  patchDraft: (patch: Partial<PipelineCreationDraft>) => void;
  clearDraft: () => void;
  requestCreateModalResume: () => void;
  consumeCreateModalResume: () => void;
  setFlashMessage: (message: PipelineCreationFlashMessage) => void;
  clearFlashMessage: () => void;
}

/** In-Memory-Flow fuer YAML-Pipeline-Erstellung zwischen Drawer, Editor und Ruecksprung. */
export const usePipelineCreationStore = create<PipelineCreationState>((set) => ({
  draft: null,
  resumeCreateModal: false,
  flashMessage: null,

  setDraft: (draft) => set({ draft }),

  patchDraft: (patch) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...patch } : state.draft,
    })),

  clearDraft: () => set({ draft: null }),

  requestCreateModalResume: () => set({ resumeCreateModal: true }),

  consumeCreateModalResume: () => set({ resumeCreateModal: false }),

  setFlashMessage: (message) => set({ flashMessage: message }),

  clearFlashMessage: () => set({ flashMessage: null }),
}));
