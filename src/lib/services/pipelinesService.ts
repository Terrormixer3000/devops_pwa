import { AxiosInstance } from "axios";
import { Pipeline, Build, BuildTimeline, BuildArtifact, AzureListResponse } from "@/types";

export const pipelinesService = {
  async listPipelines(client: AxiosInstance, project: string): Promise<Pipeline[]> {
    const res = await client.get<AzureListResponse<Pipeline>>(
      `/${project}/_apis/pipelines?api-version=7.1`
    );
    return res.data.value;
  },

  async listBuilds(
    client: AxiosInstance,
    project: string,
    definitionIds?: number[],
    top = 20,
    repositoryId?: string
  ): Promise<Build[]> {
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

  async getBuild(client: AxiosInstance, project: string, buildId: number): Promise<Build> {
    const res = await client.get<Build>(
      `/${project}/_apis/build/builds/${buildId}?api-version=7.1`
    );
    return res.data;
  },

  async getBuildTimeline(
    client: AxiosInstance,
    project: string,
    buildId: number
  ): Promise<BuildTimeline> {
    const res = await client.get<BuildTimeline>(
      `/${project}/_apis/build/builds/${buildId}/timeline?api-version=7.1`
    );
    return res.data;
  },

  async getBuildLog(
    client: AxiosInstance,
    project: string,
    buildId: number,
    logId: number
  ): Promise<string> {
    const res = await client.get(
      `/${project}/_apis/build/builds/${buildId}/logs/${logId}?api-version=7.1`,
      { responseType: "text", headers: { Accept: "text/plain" } }
    );
    return res.data;
  },

  async getArtifacts(
    client: AxiosInstance,
    project: string,
    buildId: number
  ): Promise<BuildArtifact[]> {
    const res = await client.get<AzureListResponse<BuildArtifact>>(
      `/${project}/_apis/build/builds/${buildId}/artifacts?api-version=7.1`
    );
    return res.data.value;
  },

  async queueBuild(
    client: AxiosInstance,
    project: string,
    definitionId: number,
    sourceBranch?: string,
    parameters?: Record<string, string>
  ): Promise<Build> {
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

  async cancelBuild(client: AxiosInstance, project: string, buildId: number): Promise<void> {
    await client.patch(
      `/${project}/_apis/build/builds/${buildId}?api-version=7.1`,
      { status: "cancelling" }
    );
  },
};
