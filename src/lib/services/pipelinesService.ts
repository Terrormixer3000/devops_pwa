import { AxiosInstance } from "axios";
import { Pipeline, Build, BuildTimeline, BuildArtifact, AzureListResponse } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";

export const pipelinesService = {
  /** Gibt alle Pipeline-Definitionen eines Projekts zurueck. */
  async listPipelines(client: AxiosInstance, project: string): Promise<Pipeline[]> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.listPipelines();
    }

    const res = await client.get<AzureListResponse<Pipeline>>(
      `/${project}/_apis/pipelines?api-version=7.1`
    );
    return res.data.value;
  },

  /**
   * Gibt die letzten Builds zurueck, optional gefiltert nach Pipeline-Definition und Repository.
   * @param top Maximale Anzahl Builds (Standard: 20)
   */
  async listBuilds(
    client: AxiosInstance,
    project: string,
    definitionIds?: number[],
    top = 20,
    repositoryId?: string
  ): Promise<Build[]> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.listBuilds(definitionIds, top, repositoryId);
    }

    const params = new URLSearchParams({ "$top": String(top), "api-version": "7.1" });
    if (definitionIds?.length) params.set("definitions", definitionIds.join(","));
    // Builds nach Repository filtern (Azure DevOps unterstuetzt TfsGit als Typ)
    if (repositoryId) {
      params.set("repositoryId", repositoryId);
      params.set("repositoryType", "TfsGit");
    }
    const res = await client.get<AzureListResponse<Build>>(
      `/${project}/_apis/build/builds?${params}`
    );
    return res.data.value;
  },

  /** Gibt einen einzelnen Build anhand seiner ID zurueck. */
  async getBuild(client: AxiosInstance, project: string, buildId: number): Promise<Build> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.getBuild(buildId);
    }

    const res = await client.get<Build>(
      `/${project}/_apis/build/builds/${buildId}?api-version=7.1`
    );
    return res.data;
  },

  /** Gibt die Timeline (Stages, Jobs, Steps) eines Builds zurueck. */
  async getBuildTimeline(
    client: AxiosInstance,
    project: string,
    buildId: number
  ): Promise<BuildTimeline> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.getBuildTimeline(buildId);
    }

    const res = await client.get<BuildTimeline>(
      `/${project}/_apis/build/builds/${buildId}/timeline?api-version=7.1`
    );
    return res.data;
  },

  /** Gibt den rohen Log-Text eines bestimmten Log-Eintrags zurueck. */
  async getBuildLog(
    client: AxiosInstance,
    project: string,
    buildId: number,
    logId: number
  ): Promise<string> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.getBuildLog(buildId, logId);
    }

    const res = await client.get(
      `/${project}/_apis/build/builds/${buildId}/logs/${logId}?api-version=7.1`,
      { responseType: "text", headers: { Accept: "text/plain" } }
    );
    return res.data;
  },

  /** Gibt alle Artefakte eines Builds zurueck (z.B. Pakete, Testergebnisse). */
  async getArtifacts(
    client: AxiosInstance,
    project: string,
    buildId: number
  ): Promise<BuildArtifact[]> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.getArtifacts(buildId);
    }

    const res = await client.get<AzureListResponse<BuildArtifact>>(
      `/${project}/_apis/build/builds/${buildId}/artifacts?api-version=7.1`
    );
    return res.data.value;
  },

  /**
   * Stellt einen neuen Build in die Warteschlange.
   * @param sourceBranch Branch, der gebaut werden soll (z.B. "refs/heads/main")
   * @param parameters Optionale Build-Parameter als Key-Value-Map
   */
  async queueBuild(
    client: AxiosInstance,
    project: string,
    definitionId: number,
    sourceBranch?: string,
    parameters?: Record<string, string>
  ): Promise<Build> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.queueBuild(definitionId, sourceBranch);
    }

    const body: Record<string, unknown> = {
      definition: { id: definitionId },
    };
    if (sourceBranch) body.sourceBranch = sourceBranch;
    if (parameters) body.parameters = JSON.stringify(parameters);
    const res = await client.post<Build>(
      `/${project}/_apis/build/builds?api-version=7.1`,
      body
    );
    return res.data;
  },

  /** Bricht einen laufenden Build ab (setzt Status auf 'cancelling'). */
  async cancelBuild(client: AxiosInstance, project: string, buildId: number): Promise<void> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.cancelBuild(buildId);
    }

    await client.patch(
      `/${project}/_apis/build/builds/${buildId}?api-version=7.1`,
      { status: "cancelling" }
    );
  },

  /** Gibt alle Pipeline-Ordner des Projekts als Pfad-Liste zurueck. */
  async listPipelineFolders(
    client: AxiosInstance,
    project: string
  ): Promise<string[]> {
    if (isDemoClient(client)) {
      return demoApi.pipelines.listPipelineFolders();
    }
    const res = await client.get<AzureListResponse<{ path: string }>>(
      `/${project}/_apis/build/folders?api-version=7.1`
    );
    return (res.data.value || []).map((f) => f.path);
  },

  /** Erstellt eine neue YAML-Pipeline-Definition im Projekt. */
  async createPipeline(
    client: AxiosInstance,
    project: string,
    payload: {
      name: string;
      folder?: string;
      yamlPath: string;
      repositoryId: string;
      repositoryName: string;
    }
  ): Promise<Pipeline> {
    if (isDemoClient(client)) {
      return { id: Math.floor(Math.random() * 9000) + 1000, name: payload.name, folder: payload.folder || "\\" };
    }

    const res = await client.post<Pipeline>(
      `/${project}/_apis/pipelines?api-version=7.1`,
      {
        name: payload.name,
        folder: payload.folder || "\\",
        configuration: {
          type: "yaml",
          path: payload.yamlPath,
          repository: {
            id: payload.repositoryId,
            type: "azureReposGit",
            name: payload.repositoryName,
          },
        },
      }
    );
    return res.data;
  },
};
