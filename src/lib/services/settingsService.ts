import { AppSettings } from "@/types";

// Schluessel fuer den localStorage-Eintrag
const STORAGE_KEY = "azdevops_settings";
const DEFAULT_SETTINGS: AppSettings = {
  organization: "",
  project: "",
  pat: "",
  demoMode: false,
};

export const settingsService = {
  // Einstellungen aus dem lokalen Speicher laden
  load(): AppSettings | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
    } catch {
      return null;
    }
  },

  // Einstellungen im lokalen Speicher speichern
  save(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  // Einstellungen loeschen
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  // Prueft ob alle Pflichtfelder ausgefuellt sind
  isConfigured(settings: AppSettings | null): boolean {
    if (settings?.demoMode) return true;
    return !!(settings?.organization && settings?.project && settings?.pat);
  },
};
