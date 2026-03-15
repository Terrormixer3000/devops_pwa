import { create } from "zustand";
import { AppSettings } from "@/types";
import { settingsService } from "@/lib/services/settingsService";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import {
  useDashboardRepoStore,
  usePipelineDefStore,
  usePipelineFavStore,
  usePRRepoStore,
  useReleaseDefStore,
  useReleaseFavStore,
} from "@/lib/stores/selectionStore";

/** Zustandsform des Settings-Stores mit Einstellungen und CRUD-Aktionen. */
interface SettingsState {
  settings: AppSettings | null;
  isConfigured: boolean;
  /** Gibt an, ob die Einstellungen bereits aus dem localStorage geladen wurden. */
  loaded: boolean;
  /** Setzt neue Einstellungen und persistiert sie im localStorage. */
  setSettings: (settings: AppSettings) => void;
  /** Setzt alle Einstellungen zurueck und raeumt abhaengige Stores auf. */
  clearSettings: () => void;
  /** Laedt gespeicherte Einstellungen beim App-Start aus dem localStorage. */
  loadSettings: () => void;
}

// Globaler Store fuer App-Einstellungen (PAT, Organisation, Projekt)
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isConfigured: false,
  loaded: false,

  // Einstellungen aus localStorage in den Store laden
  loadSettings: () => {
    const settings = settingsService.load();
    set({ settings, isConfigured: settingsService.isConfigured(settings), loaded: true });
  },

  // Neue Einstellungen speichern und persistieren
  setSettings: (settings: AppSettings) => {
    settingsService.save(settings);
    set({ settings, isConfigured: settingsService.isConfigured(settings) });
  },

  // Alle Einstellungen zuruecksetzen
  clearSettings: () => {
    settingsService.clear();
    useRepositoryStore.getState().setRepositories([]);
    useRepositoryStore.getState().clearSelection();
    useRepositoryStore.getState().clearFavorites();
    useRepositoryStore.getState().setShowAll(false);
    usePRRepoStore.getState().clear();
    usePipelineDefStore.getState().clear();
    useReleaseDefStore.getState().clear();
    useDashboardRepoStore.getState().clear();
    usePipelineFavStore.getState().clear();
    useReleaseFavStore.getState().clear();
    set({ settings: null, isConfigured: false });
  },
}));
