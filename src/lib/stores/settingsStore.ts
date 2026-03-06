import { create } from "zustand";
import { AppSettings } from "@/types";
import { settingsService } from "@/lib/services/settingsService";

interface SettingsState {
  settings: AppSettings | null;
  isConfigured: boolean;
  setSettings: (settings: AppSettings) => void;
  clearSettings: () => void;
  loadSettings: () => void;
}

// Globaler Store fuer App-Einstellungen (PAT, Organisation, Projekt)
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isConfigured: false,

  // Einstellungen aus localStorage in den Store laden
  loadSettings: () => {
    const settings = settingsService.load();
    set({ settings, isConfigured: settingsService.isConfigured(settings) });
  },

  // Neue Einstellungen speichern und persistieren
  setSettings: (settings: AppSettings) => {
    settingsService.save(settings);
    set({ settings, isConfigured: settingsService.isConfigured(settings) });
  },

  // Alle Einstellungen zuruecksetzen
  clearSettings: () => {
    settingsService.clear();
    set({ settings: null, isConfigured: false });
  },
}));
