import { AxiosInstance } from "axios";
import {
  PullRequest,
  PRThread,
  PRIteration,
  PRStatus,
  AzureListResponse,
} from "@/types";

export const pullRequestsService = {
  async listPullRequests(
    client: AxiosInstance,
    project: string,
    repoId: string,
    status: PRStatus = "active",
    top = 50
  ): Promise<PullRequest[]> {
    const res = await client.get<AzureListResponse<PullRequest>>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests?searchCriteria.status=${status}&$top=${top}&api-version=7.1`
    );
    return res.data.value;
  },

  async getPullRequest(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<PullRequest> {
    const res = await client.get<PullRequest>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`
    );
    return res.data;
  },

  async getThreads(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<PRThread[]> {
    const res = await client.get<AzureListResponse<PRThread>>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/threads?api-version=7.1`
    );
    return res.data.value;
  },

  async addComment(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    content: string
  ): Promise<PRThread> {
    const res = await client.post<PRThread>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/threads?api-version=7.1`,
      { comments: [{ content, commentType: 1 }], status: 1 }
    );
    return res.data;
  },

  async vote(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    reviewerId: string,
    vote: number
  ): Promise<void> {
    await client.put(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/reviewers/${reviewerId}?api-version=7.1`,
      { vote }
    );
  },

  async complete(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    lastMergeSourceCommitId: string,
    deleteSourceBranch = false
  ): Promise<PullRequest> {
    const res = await client.patch<PullRequest>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`,
      {
        status: "completed",
        lastMergeSourceCommit: { commitId: lastMergeSourceCommitId },
        completionOptions: { deleteSourceBranch, mergeStrategy: "noFastForward" },
      }
    );
    return res.data;
  },

  async create(
    client: AxiosInstance,
    project: string,
    repoId: string,
    payload: {
      title: string;
      description?: string;
      sourceRefName: string;
      targetRefName: string;
      isDraft?: boolean;
    }
  ): Promise<PullRequest> {
    const res = await client.post<PullRequest>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests?api-version=7.1`,
      payload
    );
    return res.data;
  },

  async getIterations(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<PRIteration[]> {
    const res = await client.get<AzureListResponse<PRIteration>>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/iterations?api-version=7.1`
    );
    return res.data.value;
  },

  async getIterationChanges(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    iterationId: number
  ): Promise<{ changeEntries: Array<{ item: { path: string }; changeType: string }> }> {
    const res = await client.get(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/iterations/${iterationId}/changes?api-version=7.1`
    );
    return res.data;
  },
};
