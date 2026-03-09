"use client";

import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { createAzureClient } from "@/lib/api/client";
import { identityService, type AzureCurrentUser } from "@/lib/services/identityService";

/**
 * Hook zum Laden des aktuellen Azure DevOps Benutzers.
 * Verwendet React Query mit staleTime: Infinity und gibt den User oder null zurueck.
 */
export function useCurrentUser(): {
  currentUser: AzureCurrentUser | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const settings = useSettingsStore((s) => s.settings);
  const canResolve = !!settings &&
    !!settings.organization &&
    !!settings.project &&
    (!!settings.pat || !!settings.demoMode);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["current-user", settings?.organization, settings?.project, settings?.demoMode],
    queryFn: async () => {
      if (!settings) return null;
      const client = createAzureClient(settings);
      return identityService.getCurrentUser(client);
    },
    enabled: canResolve,
    staleTime: Infinity,
    retry: 1,
  });

  return { currentUser: data ?? null, isLoading: isLoading && canResolve, refetch };
}
