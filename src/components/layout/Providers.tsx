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
      refetchOnWindowFocus: false,
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
    // Repositories laden wenn Einstellungen vorhanden
    if (!isConfigured || !settings) return;
    const client = createAzureClient(settings);
    repositoriesService
      .listRepositories(client, settings.project)
      .then((repos) => setRepositories(repos))
      .catch(console.error);
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
