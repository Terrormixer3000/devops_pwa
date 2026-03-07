"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { createAzureClient } from "@/lib/api/client";

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit />
      {children}
    </QueryClientProvider>
  );
}
