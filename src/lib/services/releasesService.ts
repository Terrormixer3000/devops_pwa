import { AxiosInstance } from "axios";
import { ReleaseDefinition, Release, ReleaseApproval, AzureListResponse } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";

export const releasesService = {
  async listDefinitions(
    vsrmClient: AxiosInstance,
    project: string
  ): Promise<ReleaseDefinition[]> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.listDefinitions();
    }

    const res = await vsrmClient.get<AzureListResponse<ReleaseDefinition>>(
      `/${project}/_apis/release/definitions?api-version=7.1`
    );
    return res.data.value;
  },

  async getDefinition(
    vsrmClient: AxiosInstance,
    project: string,
    definitionId: number
  ): Promise<ReleaseDefinition> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.getDefinition(definitionId);
    }

    const res = await vsrmClient.get<ReleaseDefinition>(
      `/${project}/_apis/release/definitions/${definitionId}?api-version=7.1`
    );
    return res.data;
  },

  async listReleases(
    vsrmClient: AxiosInstance,
    project: string,
    definitionId?: number,
    top = 20
  ): Promise<Release[]> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.listReleases(definitionId, top);
    }

    const params = new URLSearchParams({ "$top": String(top), "api-version": "7.1" });
    if (definitionId) params.set("definitionId", String(definitionId));
    const res = await vsrmClient.get<AzureListResponse<Release>>(
      `/${project}/_apis/release/releases?${params}`
    );
    return res.data.value;
  },

  async getRelease(
    vsrmClient: AxiosInstance,
    project: string,
    releaseId: number
  ): Promise<Release> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.getRelease(releaseId);
    }

    const res = await vsrmClient.get<Release>(
      `/${project}/_apis/release/releases/${releaseId}?api-version=7.1`
    );
    return res.data;
  },

  async createRelease(
    vsrmClient: AxiosInstance,
    project: string,
    definitionId: number,
    description?: string
  ): Promise<Release> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.createRelease(definitionId, description);
    }

    const res = await vsrmClient.post<Release>(
      `/${project}/_apis/release/releases?api-version=7.1`,
      {
        definitionId,
        description: description || "",
        isDraft: false,
        manualEnvironments: [],
      }
    );
    return res.data;
  },

  async getPendingApprovals(
    vsrmClient: AxiosInstance,
    project: string,
    assignedToFilter?: string
  ): Promise<ReleaseApproval[]> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.getPendingApprovals();
    }

    const params = new URLSearchParams({ "api-version": "7.1", "statusFilter": "pending" });
    if (assignedToFilter) params.set("assignedToFilter", assignedToFilter);
    const res = await vsrmClient.get<AzureListResponse<ReleaseApproval>>(
      `/${project}/_apis/release/approvals?${params}`
    );
    return res.data.value;
  },

  async approveRelease(
    vsrmClient: AxiosInstance,
    project: string,
    approvalId: number,
    comments?: string
  ): Promise<ReleaseApproval> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.approveRelease(approvalId, comments);
    }

    const res = await vsrmClient.patch<ReleaseApproval>(
      `/${project}/_apis/release/approvals/${approvalId}?api-version=7.1`,
      { status: "approved", comments: comments || "" }
    );
    return res.data;
  },

  async rejectApproval(
    vsrmClient: AxiosInstance,
    project: string,
    approvalId: number,
    comments?: string
  ): Promise<ReleaseApproval> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.rejectApproval(approvalId, comments);
    }

    const res = await vsrmClient.patch<ReleaseApproval>(
      `/${project}/_apis/release/approvals/${approvalId}?api-version=7.1`,
      { status: "rejected", comments: comments || "" }
    );
    return res.data;
  },
};
