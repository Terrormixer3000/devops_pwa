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
  clearFavorites: () => void;
  setShowAll: (show: boolean) => void;

  loadPersistedSelection: () => void;
  persistSelection: () => void;
}

/**
 * Zustand und Aktionen fuer das Repository-Management:
 * - Geladene Repositories und Auswahl
 * - Favoriten-Verwaltung
 * - Persistierung im localStorage
 */
export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repositories: [],
  selectedRepositories: [],
  favorites: [],
  showAllRepos: false,

  /**
   * Setzt die vollstaendige Repository-Liste und bereinigt die Auswahl.
   * Bereits ausgewaehlte Repos die nicht mehr in der Liste sind werden entfernt.
   */
  setRepositories: (repos) => {
    const selected = get().selectedRepositories.filter((selectedRepo) =>
      repos.some((repo) => repo.id === selectedRepo.id)
    );
    set({ repositories: repos, selectedRepositories: selected });
    if (typeof window !== "undefined") {
      try { localStorage.setItem(SELECTED_KEY, JSON.stringify(selected)); } catch { /* ignore */ }
    }
  },

  /** Setzt ein einzelnes Repository als alleinige Auswahl und persistiert sie. */
  selectRepository: (repo) => {
    set({ selectedRepositories: [repo] });
    get().persistSelection();
  },

  /** Fuegt ein Repository zur Mehrfachauswahl hinzu oder entfernt es daraus. */
  toggleRepository: (repo) => {
    const current = get().selectedRepositories;
    const exists = current.find((r) => r.id === repo.id);
    const updated = exists
      ? current.filter((r) => r.id !== repo.id)
      : [...current, repo];
    set({ selectedRepositories: updated });
    get().persistSelection();
  },

  /** Leert die gesamte Repository-Auswahl und entfernt den localStorage-Eintrag. */
  clearSelection: () => {
    set({ selectedRepositories: [] });
    localStorage.removeItem(SELECTED_KEY);
  },

  /** Alias fuer `selectRepository` — setzt genau ein Repository als Auswahl. */
  setSingleRepo: (repo) => {
    set({ selectedRepositories: [repo] });
    get().persistSelection();
  },

  /** Fuegt ein Repository zu den Favoriten hinzu oder entfernt es daraus. */
  toggleFavorite: (id) => {
    const current = get().favorites;
    const updated = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id];
    favoritesService.save(updated);
    set({ favorites: updated });
  },

  /** Laedt die Favoriten-IDs aus dem localStorage ueber den favoritesService. */
  loadFavorites: () => {
    const favorites = favoritesService.load();
    set({ favorites });
  },

  /** Loescht alle Favoriten (Store + Persistenz). */
  clearFavorites: () => {
    favoritesService.clear();
    set({ favorites: [] });
  },

  /** Steuert, ob alle Repositories angezeigt werden oder nur Favoriten/Auswahl. */
  setShowAll: (show) => set({ showAllRepos: show }),

  /** Laedt die persistierte Repository-Auswahl aus dem localStorage beim Start der App. */
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

  /** Schreibt die aktuelle Auswahl in den localStorage. */
  persistSelection: () => {
    const selected = get().selectedRepositories;
    try { localStorage.setItem(SELECTED_KEY, JSON.stringify(selected)); } catch { /* ignore */ }
  },
}));
