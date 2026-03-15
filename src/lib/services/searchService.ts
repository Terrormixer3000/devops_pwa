import { isDemoClient } from "@/lib/api/client";
import type { AxiosInstance } from "axios";

/** Einzelnes Code-Suchergebnis aus der Azure Search API. */
export interface CodeSearchResult {
  fileName: string;
  path: string;
  repository: { name: string };
  matches: { type: string; charOffset: number; length: number }[];
  contentId: string;
}

/** Service fuer die Azure DevOps Code-Search API. */
export const searchService = {
  /** Sucht Code im angegebenen Repository. Demo-Modus gibt leere Liste zurueck. */
  async searchCode(
    client: AxiosInstance,
    project: string,
    repoName: string,
    query: string
  ): Promise<CodeSearchResult[]> {
    if (isDemoClient(client)) return [];
    const res = await client.post(`/_apis/search/codesearchresults?api-version=7.1`, {
      searchText: query,
      $top: 50,
      filters: { Project: [project], Repository: [repoName] },
    });
    return res.data?.results ?? [];
  },
};
