import { AppSettings } from "@/types";
import { DEFAULT_PUSH_EVENT_PREFERENCES } from "@/lib/utils/pushEventPreferences";

/**
 * Browser-seitiger Service zum Lesen, Schreiben und Loeschen der App-Einstellungen.
 * Alle Daten werden im localStorage unter dem Schluessel `azdevops_settings` gespeichert.
 */

// Schluessel fuer den localStorage-Eintrag
const STORAGE_KEY = "azdevops_settings";
const LOCALE_COOKIE = "azdevops_locale";
const DEFAULT_SETTINGS: AppSettings = {
  organization: "",
  project: "",
  availableProjects: [],
  pat: "",
  demoMode: false,
  theme: "dark",
  pushEventPreferences: DEFAULT_PUSH_EVENT_PREFERENCES,
};

export const settingsService = {
  // Einstellungen aus dem lokalen Speicher laden
  load(): AppSettings | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      // Migration: availableProjects aus bestehendem project-Wert befuellen
      if (!parsed.availableProjects && merged.project) {
        merged.availableProjects = [merged.project];
      }
      return merged;
    } catch {
      return null;
    }
  },

  // Einstellungen im lokalen Speicher speichern
  save(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Locale auch als Cookie persistieren, damit der Server beim nächsten Request
    // die richtige Sprache kennt und kein Flackern beim SSR entsteht.
    if (settings.locale) {
      document.cookie = `${LOCALE_COOKIE}=${settings.locale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  },

  // Einstellungen loeschen
  clear(): void {
    if (typeof window === "undefined") return;

    // Beim Zuruecksetzen sollen alle app-spezifischen Persistenzen entfernt werden.
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith("azdevops_")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
  },

  // Prueft ob alle Pflichtfelder ausgefuellt sind
  isConfigured(settings: AppSettings | null): boolean {
    if (settings?.demoMode) return true;
    return !!(settings?.organization && settings?.project && settings?.pat);
  },
};
