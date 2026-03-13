import { create } from "zustand";

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
  editorContent: string;
  fileExistsOnDefaultBranch: boolean | null;
}

interface PipelineCreationState {
  draft: PipelineCreationDraft | null;
  flashMessage: PipelineCreationFlashMessage | null;
  setDraft: (draft: PipelineCreationDraft) => void;
  patchDraft: (patch: Partial<PipelineCreationDraft>) => void;
  clearDraft: () => void;
  setFlashMessage: (message: PipelineCreationFlashMessage) => void;
  clearFlashMessage: () => void;
}

/** In-Memory-Draft fuer den YAML-Pipeline-Flow zwischen Drawer und Editor. */
export const usePipelineCreationStore = create<PipelineCreationState>((set) => ({
  draft: null,
  flashMessage: null,

  setDraft: (draft) => set({ draft }),

  patchDraft: (patch) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...patch } : state.draft,
    })),

  clearDraft: () => set({ draft: null }),

  setFlashMessage: (message) => set({ flashMessage: message }),

  clearFlashMessage: () => set({ flashMessage: null }),
}));
