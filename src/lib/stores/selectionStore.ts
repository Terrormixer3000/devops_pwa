import { create } from "zustand";

// Generischer Zustand fuer Domain-Auswahlen (PRs, Pipelines, Releases, Dashboard)
interface SelectionState {
  selectedIds: string[];
  toggle: (id: string) => void;
  setIds: (ids: string[]) => void;
  clear: () => void;
  load: () => void;
}

// Generischer Zustand fuer Favoriten-Listen (Pipelines, Release-Definitionen)
interface FavoritesState {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  load: () => void;
  clear: () => void;
}

function createFavoritesStore(storageKey: string) {
  return create<FavoritesState>((set, get) => ({
    favoriteIds: [],

    toggleFavorite: (id) => {
      const current = get().favoriteIds;
      const updated = current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id];
      set({ favoriteIds: updated });
      localStorage.setItem(storageKey, JSON.stringify(updated));
    },

    load: () => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) set({ favoriteIds: JSON.parse(raw) });
      } catch { /* ignore */ }
    },

    clear: () => {
      set({ favoriteIds: [] });
      localStorage.removeItem(storageKey);
    },
  }));
}

// Favoriten-Store fuer Pipeline-Definitionen
export const usePipelineFavStore = createFavoritesStore("azdevops_fav_pipelines");

// Favoriten-Store fuer Release-Definitionen
export const useReleaseFavStore = createFavoritesStore("azdevops_fav_releases");

// Factory: erstellt einen Store mit localStorage-Persistenz pro Domain
function createSelectionStore(storageKey: string) {
  return create<SelectionState>((set, get) => ({
    selectedIds: [],

    toggle: (id) => {
      const current = get().selectedIds;
      const updated = current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id];
      set({ selectedIds: updated });
      localStorage.setItem(storageKey, JSON.stringify(updated));
    },

    setIds: (ids) => {
      set({ selectedIds: ids });
      localStorage.setItem(storageKey, JSON.stringify(ids));
    },

    clear: () => {
      set({ selectedIds: [] });
      localStorage.removeItem(storageKey);
    },

    // Beim Mount aus localStorage laden (wird im Selektor-Komponent aufgerufen)
    load: () => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) set({ selectedIds: JSON.parse(raw) });
      } catch { /* ignore */ }
    },
  }));
}

// Auswahl-Store fuer Pull-Request-Seite (mehrere Repositories)
export const usePRRepoStore = createSelectionStore("azdevops_sel_pr_repos");

// Auswahl-Store fuer Pipelines-Seite (mehrere Pipeline-Definitionen)
export const usePipelineDefStore = createSelectionStore("azdevops_sel_pipeline_defs");

// Auswahl-Store fuer Releases-Seite (mehrere Release-Definitionen)
export const useReleaseDefStore = createSelectionStore("azdevops_sel_release_defs");

// Auswahl-Store fuer Dashboard (Repositories fuer PRs + Builds)
export const useDashboardRepoStore = createSelectionStore("azdevops_sel_dashboard_repos");
