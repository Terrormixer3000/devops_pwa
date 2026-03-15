/**
 * Projects Service
 *
 * Laedt alle Azure DevOps Projekte der konfigurierten Organisation.
 * Wird in den Settings verwendet, um verfuegbare Projekte zu entdecken.
 */

import { AxiosInstance } from "axios";
import { isDemoClient } from "@/lib/api/client";

/** Minimale Projektdaten aus der Azure DevOps Projects API. */
export interface AzureProject {
  id: string;
  name: string;
  description?: string;
}

interface ProjectsResponse {
  value: AzureProject[];
  count: number;
}

export const projectsService = {
  /** Laedt alle Projekte der Organisation (max. 200). */
  async listProjects(client: AxiosInstance): Promise<AzureProject[]> {
    if (isDemoClient(client)) return [];
    const response = await client.get<ProjectsResponse>(
      "/_apis/projects?api-version=7.1&$top=200"
    );
    return response.data.value ?? [];
  },
};
