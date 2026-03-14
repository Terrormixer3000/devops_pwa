import { AxiosInstance } from "axios";
import { ReleaseDefinition, Release, ReleaseApproval, ReleaseStageConfig, AzureListResponse } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";

export const releasesService = {
  /** Gibt alle Release-Pipeline-Definitionen eines Projekts zurueck. */
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

  /** Gibt eine einzelne Release-Pipeline-Definition inkl. Umgebungsstufen zurueck. */
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

  /**
   * Gibt die letzten Release-Instanzen zurueck.
   * @param definitionId Optionaler Filter nach Pipeline-Definition
   * @param top Maximale Anzahl (Standard: 20)
   */
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

  /** Gibt einen einzelnen Release inkl. aller Umgebungsstatus zurueck. */
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

  /** Erstellt einen neuen Release aus einer Pipeline-Definition. */
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

  /**
   * Gibt ausstehende Release-Approvals zurueck.
   * @param assignedToFilter Optional: nur Approvals fuer diesen Benutzer
   */
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

  /** Genehmigt eine ausstehende Release-Approval. */
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

  /** Lehnt eine ausstehende Release-Approval ab. */
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

  /** Erstellt eine neue Classic Release-Pipeline-Definition. */
  async createDefinition(
    vsrmClient: AxiosInstance,
    project: string,
    payload: {
      name: string;
      description?: string;
      stages: ReleaseStageConfig[];
      releaseNameFormat?: string;
      artifact?: {
        definitionId: number;
        definitionName: string;
        projectId: string;
        projectName: string;
      };
    }
  ): Promise<ReleaseDefinition> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.createDefinition(
        payload.name,
        payload.description,
        payload.stages.map((s) => s.name)
      );
    }

    const format = payload.releaseNameFormat || "Release-$(rev:r)";

    /** Baut den Approval-Block fuer pre- oder post-deployment aus der Stage-Konfiguration. */
    const buildApprovals = (config: ReleaseStageConfig["preApprovals"]) => {
      if (config.isAutomated) {
        return {
          approvals: [{ rank: 1, isAutomated: true, isNotificationOn: false }],
          approvalOptions: { requiredApproverCount: 0, releaseCreatorCanBeApprover: false },
        };
      }
      return {
        approvals: config.approvers.map((approver, i) => ({
          rank: i + 1,
          isAutomated: false,
          isNotificationOn: true,
          approver: { uniqueName: approver },
        })),
        approvalOptions: {
          requiredApproverCount: config.approvers.length,
          releaseCreatorCanBeApprover: false,
        },
      };
    };

    // Jede Stage wird mit Tasks, Approvals und Agent-Spezifikation befuellt
    const environments = payload.stages.map((stage, index) => ({
      name: stage.name,
      rank: index + 1,
      variables: {},
      variableGroups: [],
      preDeployApprovals: buildApprovals(stage.preApprovals),
      postDeployApprovals: buildApprovals(stage.postApprovals),
      deployPhases: [
        {
          deploymentInput: {
            parallelExecution: { parallelExecutionType: "none" },
            agentSpecification: { identifier: stage.agentSpec },
            skipArtifactsDownload: false,
            timeoutInMinutes: 0,
            demands: [],
            enableAccessToken: false,
            type: 1,
          },
          rank: 1,
          phaseType: "agentBasedDeployment",
          name: "Agentauftrag",
          workflowTasks: stage.tasks.map((task) => ({
            taskId: task.taskId,
            version: task.version,
            name: task.name,
            enabled: task.enabled,
            inputs: task.inputs,
          })),
        },
      ],
      retentionPolicy: { daysToKeep: 30, releasesToKeep: 3, retainBuild: true },
    }));

    // Artifact nur hinzufuegen wenn angegeben
    const artifacts = payload.artifact
      ? [
          {
            type: "Build",
            alias: `_${payload.artifact.definitionName}`,
            isPrimary: true,
            definitionReference: {
              definition: { id: String(payload.artifact.definitionId), name: payload.artifact.definitionName },
              project: { id: payload.artifact.projectId, name: payload.artifact.projectName },
              defaultVersionType: { id: "latestType", name: "Latest" },
            },
          },
        ]
      : [];

    const res = await vsrmClient.post<ReleaseDefinition>(
      `/${project}/_apis/release/definitions?api-version=7.1`,
      {
        name: payload.name,
        description: payload.description || "",
        variables: {},
        variableGroups: [],
        environments,
        artifacts,
        triggers: [],
        releaseNameFormat: format,
        isDraft: false,
      }
    );
    return res.data;
  },

  /** Gibt den kombinierten Deploy-Log einer Umgebungsstufe als Text zurueck. */
  async getEnvironmentLogs(
    vsrmClient: AxiosInstance,
    project: string,
    releaseId: number,
    environmentId: number
  ): Promise<string> {
    if (isDemoClient(vsrmClient)) {
      return demoApi.releases.getEnvironmentLogs(releaseId, environmentId);
    }

    // Gibt kombinierten Log-Text aller Deploy-Phasen zurueck
    const res = await vsrmClient.get<string>(
      `/${project}/_apis/release/releases/${releaseId}/environments/${environmentId}/logs?api-version=7.1`,
      { responseType: "text", headers: { Accept: "text/plain" } }
    );
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
  },
};
