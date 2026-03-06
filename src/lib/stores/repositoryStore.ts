import { create } from "zustand";
import { Repository } from "@/types";
import { favoritesService } from "@/lib/services/favoritesService";

const SELECTED_KEY = "azdevops_selected_repos";

interface RepositoryState {
  repositories: Repository[];
  selectedRepositories: Repository[];
  favorites: string[];
  showAllRepos: boolean;

  setRepositories: (repos: Repository[]) => void;
  selectRepository: (repo: Repository) => void;
  toggleRepository: (repo: Repository) => void;
  clearSelection: () => void;
  setSingleRepo: (repo: Repository) => void;

  toggleFavorite: (id: string) => void;
  loadFavorites: () => void;
  setShowAll: (show: boolean) => void;

  loadPersistedSelection: () => void;
  persistSelection: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repositories: [],
  selectedRepositories: [],
  favorites: [],
  showAllRepos: false,

  setRepositories: (repos) => set({ repositories: repos }),

  selectRepository: (repo) => {
    set({ selectedRepositories: [repo] });
    get().persistSelection();
  },

  toggleRepository: (repo) => {
    const current = get().selectedRepositories;
    const exists = current.find((r) => r.id === repo.id);
    const updated = exists
      ? current.filter((r) => r.id !== repo.id)
      : [...current, repo];
    set({ selectedRepositories: updated });
    get().persistSelection();
  },

  clearSelection: () => {
    set({ selectedRepositories: [] });
    localStorage.removeItem(SELECTED_KEY);
  },

  setSingleRepo: (repo) => {
    set({ selectedRepositories: [repo] });
    get().persistSelection();
  },

  toggleFavorite: (id) => {
    const current = get().favorites;
    const updated = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id];
    favoritesService.save(updated);
    set({ favorites: updated });
  },

  loadFavorites: () => {
    const favorites = favoritesService.load();
    set({ favorites });
  },

  setShowAll: (show) => set({ showAllRepos: show }),

  loadPersistedSelection: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SELECTED_KEY);
      if (raw) {
        const repos = JSON.parse(raw) as Repository[];
        set({ selectedRepositories: repos });
      }
    } catch { /* ignore */ }
  },

  persistSelection: () => {
    const selected = get().selectedRepositories;
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selected));
  },
}));
