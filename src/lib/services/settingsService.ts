import { AppSettings } from "@/types";

// Schluessel fuer den localStorage-Eintrag
const STORAGE_KEY = "azdevops_settings";

export const settingsService = {
  // Einstellungen aus dem lokalen Speicher laden
  load(): AppSettings | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AppSettings;
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
    return !!(settings?.organization && settings?.project && settings?.pat);
  },
};
