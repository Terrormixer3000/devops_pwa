import { useMemo } from "react";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { createAzureClient, createVsrmClient } from "@/lib/api/client";
import { AxiosInstance } from "axios";

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
