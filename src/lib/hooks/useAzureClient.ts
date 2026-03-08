import { useMemo } from "react";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { createAzureClient, createVsrmClient } from "@/lib/api/client";
import { AxiosInstance } from "axios";

/**
 * Hook der Axios-Clients fuer die Azure DevOps API bereitstellt.
 * Gibt null zurueck wenn noch keine Einstellungen konfiguriert sind.
 * Die Clients werden nur neu erstellt wenn sich die Settings aendern.
 */
export function useAzureClient(): { client: AxiosInstance | null; vsrmClient: AxiosInstance | null } {
  const settings = useSettingsStore((s) => s.settings);

  const client = useMemo(() => {
    if (!settings) return null;
    return createAzureClient(settings);
  }, [settings]);

  const vsrmClient = useMemo(() => {
    if (!settings) return null;
    return createVsrmClient(settings);
  }, [settings]);

  return { client, vsrmClient };
}
