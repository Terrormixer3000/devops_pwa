import { AxiosInstance } from "axios";
import {
  PullRequest,
  PRThread,
  PRIteration,
  PRStatus,
  AzureListResponse,
} from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";

export const pullRequestsService = {
  /**
   * Listet Pull Requests in einem Repository auf.
   * @param status Filtert nach PR-Status (Standard: "active")
   * @param top Maximale Anzahl (Standard: 50)
   */
  async listPullRequests(
    client: AxiosInstance,
    project: string,
    repoId: string,
    status: PRStatus = "active",
    top = 50
  ): Promise<PullRequest[]> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.listPullRequests(repoId, status, top);
    }

    const res = await client.get<AzureListResponse<PullRequest>>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests?searchCriteria.status=${status}&$top=${top}&api-version=7.1`
    );
    return res.data.value;
  },

  /** Gibt einen einzelnen PR vollstaendig zurueck. */
  async getPullRequest(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<PullRequest> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.getPullRequest(repoId, prId);
    }

    const res = await client.get<PullRequest>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`
    );
    return res.data;
  },

  /** Gibt alle Kommentar-Threads eines PRs zurueck. */
  async getThreads(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<PRThread[]> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.getThreads(repoId, prId);
    }

    const res = await client.get<AzureListResponse<PRThread>>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/threads?api-version=7.1`
    );
    return res.data.value;
  },

  /** Erstellt einen neuen Top-Level-Kommentar-Thread im PR. */
  async addComment(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    content: string
  ): Promise<PRThread> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.addComment(repoId, prId, content);
    }

    const res = await client.post<PRThread>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/threads?api-version=7.1`,
      { comments: [{ content, commentType: 1 }], status: 1 }
    );
    return res.data;
  },

  /**
   * Setzt den Vote des aktuellen Benutzers fuer einen PR.
   * @param vote Negativer Wert = ablehnen, 0 = neutral, positiver Wert = zustimmen
   */
  async vote(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    reviewerId: string,
    vote: number
  ): Promise<void> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.vote(repoId, prId, reviewerId, vote);
    }

    await client.put(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/reviewers/${reviewerId}?api-version=7.1`,
      { vote }
    );
  },

  /**
   * Schliesst einen PR ab (Merge).
   * @param lastMergeSourceCommitId Letzter bekannter Commit-Hash des Source-Branches
   * @param deleteSourceBranch Source-Branch nach dem Merge loeschen
   * @param mergeStrategy Merge-Strategie (Standard: noFastForward)
   */
  async complete(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    lastMergeSourceCommitId: string,
    deleteSourceBranch = false,
    mergeStrategy: "noFastForward" | "squash" | "rebase" | "rebaseMerge" = "noFastForward"
  ): Promise<PullRequest> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.complete(repoId, prId, lastMergeSourceCommitId, deleteSourceBranch);
    }

    const res = await client.patch<PullRequest>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`,
      {
        status: "completed",
        lastMergeSourceCommit: { commitId: lastMergeSourceCommitId },
        completionOptions: { deleteSourceBranch, mergeStrategy },
      }
    );
    return res.data;
  },

  /** Erstellt einen neuen Pull Request. */
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
      reviewers?: { id: string }[];
    }
  ): Promise<PullRequest> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.create(repoId, payload);
    }

    const res = await client.post<PullRequest>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests?api-version=7.1`,
      payload
    );
    return res.data;
  },

  /** Gibt alle Iterationen (Push-Events) eines PRs zurueck. */
  async getIterations(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<PRIteration[]> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.getIterations(repoId, prId);
    }

    const res = await client.get<AzureListResponse<PRIteration>>(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/iterations?api-version=7.1`
    );
    return res.data.value;
  },

  /** Gibt die geaenderten Dateien einer bestimmten PR-Iteration zurueck. */
  async getIterationChanges(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    iterationId: number
  ): Promise<{ changeEntries: Array<{ item: { path: string; gitObjectType?: "blob" | "tree" }; changeType: string; originalPath?: string }> }> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.getIterationChanges(repoId, prId, iterationId);
    }

    const res = await client.get(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/iterations/${iterationId}/changes?api-version=7.1`
    );
    return res.data;
  },

  /**
   * Aktiviert Auto-Complete fuer einen PR.
   * Der PR wird automatisch gemergt sobald alle Policies erfuellt sind.
   */
  async enableAutoComplete(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    userId: string,
    completionOptions: {
      mergeStrategy?: "noFastForward" | "squash" | "rebase" | "rebaseMerge";
      deleteSourceBranch?: boolean;
    } = {}
  ): Promise<void> {
    if (isDemoClient(client)) {
      return; // Demo: kein Fehler, keine Aktion noetig
    }

    await client.patch(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`,
      {
        autoCompleteSetBy: { id: userId },
        completionOptions: {
          mergeStrategy: completionOptions.mergeStrategy || "noFastForward",
          deleteSourceBranch: completionOptions.deleteSourceBranch || false,
        },
      }
    );
  },

  /** Deaktiviert Auto-Complete fuer einen PR. */
  async disableAutoComplete(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<void> {
    if (isDemoClient(client)) return;

    await client.patch(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`,
      { autoCompleteSetBy: null }
    );
  },

  /** Gibt den aktuellen Policy-Auswertungsstatus aller Branch-Policies fuer den PR zurueck. */
  async getPolicies(
    client: AxiosInstance,
    project: string,
    prId: number
  ): Promise<Array<{ id: string; status: string; displayName: string; isRequired: boolean }>> {
    if (isDemoClient(client)) {
      return demoApi.pullRequests.getPolicies(prId);
    }

    const artifactId = `vstfs:///CodeReview/CodeReviewId/${project}/${prId}`;
    const params = new URLSearchParams({ artifactId, "api-version": "7.1" });
    const res = await client.get<{ value: Array<{ evaluationId: string; status: string; configuration: { settings?: { displayName?: string }; isEnabledAndBlocking: boolean } }> }>(
      `/${project}/_apis/policy/evaluations?${params.toString()}`
    );
    return (res.data.value || []).map((e) => ({
      id: e.evaluationId,
      status: e.status,
      displayName: e.configuration?.settings?.displayName || "Policy",
      isRequired: e.configuration?.isEnabledAndBlocking || false,
    }));
  },

  /** Thread-Status aendern (z.B. resolve / reopen). */
  async updateThreadStatus(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    threadId: number,
    status: PRThread["status"]
  ): Promise<void> {
    if (isDemoClient(client)) return;
    await client.patch(
      `/${project}/_apis/git/repositories/${repoId}/pullRequests/${prId}/threads/${threadId}?api-version=7.1`,
      { status }
    );
  },

  /** Eigenen Kommentar bearbeiten. */
  async editComment(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    threadId: number,
    commentId: number,
    content: string
  ): Promise<void> {
    if (isDemoClient(client)) return;
    await client.patch(
      `/${project}/_apis/git/repositories/${repoId}/pullRequests/${prId}/threads/${threadId}/comments/${commentId}?api-version=7.1`,
      { content }
    );
  },

  /** Reviewer hinzufuegen oder aktualisieren (upsert via PUT). */
  async addReviewer(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    reviewerId: string,
    isRequired: boolean
  ): Promise<void> {
    if (isDemoClient(client)) return;
    await client.put(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/reviewers/${reviewerId}?api-version=7.1`,
      { vote: 0, isRequired }
    );
  },

  /** Reviewer aus dem PR entfernen. */
  async removeReviewer(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    reviewerId: string
  ): Promise<void> {
    if (isDemoClient(client)) return;
    await client.delete(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}/reviewers/${reviewerId}?api-version=7.1`
    );
  },

  /** Auf einen bestehenden Thread antworten. */
  async replyToThread(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    threadId: number,
    content: string
  ): Promise<void> {
    if (isDemoClient(client)) return;
    await client.post(
      `/${project}/_apis/git/repositories/${repoId}/pullRequests/${prId}/threads/${threadId}/comments?api-version=7.1`,
      { content, commentType: 1 }
    );
  },

  /** Setzt den Status eines PRs auf 'abandoned'. */
  async abandonPR(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number
  ): Promise<void> {
    if (isDemoClient(client)) {
      return Promise.resolve();
    }

    await client.patch(
      `/${project}/_apis/git/repositories/${repoId}/pullrequests/${prId}?api-version=7.1`,
      { status: "abandoned" }
    );
  },

  /** Eigenen Kommentar loeschen. */
  async deleteComment(
    client: AxiosInstance,
    project: string,
    repoId: string,
    prId: number,
    threadId: number,
    commentId: number
  ): Promise<void> {
    if (isDemoClient(client)) return;
    await client.delete(
      `/${project}/_apis/git/repositories/${repoId}/pullRequests/${prId}/threads/${threadId}/comments/${commentId}?api-version=7.1`
    );
  },
};

