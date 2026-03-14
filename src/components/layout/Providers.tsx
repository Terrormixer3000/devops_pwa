"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { createAzureClient } from "@/lib/api/client";
import { messages, detectBrowserLocale } from "@/lib/i18n";
import { setDemoLocale } from "@/lib/mocks/demoData";
import type { Locale } from "@/types";

// Globaler QueryClient fuer React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 Minuten Cache-Zeit
      gcTime: 1000 * 60 * 60 * 24, // 24 Stunden – Daten bleiben fuer Offline-Nutzung im Speicher
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Nach Netzwerk-Wiederherstellung automatisch aktualisieren
    },
  },
});

/**
 * Laedt die gespeicherte oder automatisch erkannte Sprache und stellt
 * sie per NextIntlClientProvider bereit. Reagiert auf Aenderungen in den Settings.
 */
function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const { settings, setSettings } = useSettingsStore();
  const locale = settings?.locale ?? initialLocale;

  const qc = useQueryClient();
  useEffect(() => {
    setDemoLocale(locale);
    // Demo-Queries invalidieren damit Texte in der neuen Sprache nachgeladen werden.
    qc.invalidateQueries({ queryKey: ["pr-policies"] });
    qc.invalidateQueries({ queryKey: ["pr-threads"] });
  }, [locale, qc]);

  useEffect(() => {
    if (settings?.locale) {
      document.documentElement.lang = settings.locale;
      // Cookie aktualisieren, falls noch nicht vorhanden (z.B. nach erstem Update mit Cookie-Support)
      if (!document.cookie.includes("azdevops_locale=")) {
        document.cookie = `azdevops_locale=${settings.locale}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } else if (settings && !settings.locale) {
      const detected = detectBrowserLocale();
      document.documentElement.lang = detected;
      setSettings({ ...settings, locale: detected });
    } else {
      document.documentElement.lang = initialLocale;
    }
  }, [initialLocale, settings, setSettings]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Initialisierungskomponente ohne visuellen Output.
 * Laedt beim App-Start gespeicherte Einstellungen, Favoriten, Repository-Auswahl
 * und bootstrapped das Theme sowie den Standalone-Status.
 */
function AppInit() {
  const { loadSettings, settings, isConfigured } = useSettingsStore();
  const { loadFavorites, loadPersistedSelection, setRepositories } = useRepositoryStore();

  useEffect(() => {
    // Einstellungen und Favoriten beim Start laden
    loadSettings();
    loadFavorites();
    loadPersistedSelection();
  }, [loadSettings, loadFavorites, loadPersistedSelection]);

  useEffect(() => {
    // iOS Home-Screen-Apps melden den Standalone-Modus nicht immer sauber per CSS-Media-Query.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

    document.documentElement.dataset.displayMode = isStandalone ? "standalone" : "browser";
  }, []);

  useEffect(() => {
    // Das Theme wird global am HTML-Element gesetzt, damit alle Farbvariablen zentral umschalten.
    const theme = settings?.theme || "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#f7f4ee" : "#1b1a19");
  }, [settings?.theme]);

  useEffect(() => {
    // Repositories laden wenn Einstellungen vorhanden
    if (!isConfigured || !settings) {
      setRepositories([]);
      return;
    }
    // Der gleiche Initialisierungspfad funktioniert fuer Live- und Demo-Modus.
    const client = createAzureClient(settings);
    repositoriesService
      .listRepositories(client, settings.project)
      .then((repos) => setRepositories(repos))
      .catch((error) => {
        console.error(error);
        setRepositories([]);
      });
  }, [isConfigured, settings, setRepositories]);

  return null;
}

/**
 * Root-Provider-Wrapper: bindet React Query ein und fuehrt die App-Initialisierung durch.
 * Muss moeglichst weit oben im Komponent-Baum (in layout.tsx) verwendet werden.
 */
export function Providers({ children, initialLocale = "de" }: { children: React.ReactNode; initialLocale?: Locale }) {
  // Demo-Locale synchron setzen, damit React Query beim ersten Fetch bereits die richtige Sprache verwendet.
  setDemoLocale(initialLocale);
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={initialLocale}>
        <AppInit />
        {children}
      </LocaleProvider>
    </QueryClientProvider>
  );
}
