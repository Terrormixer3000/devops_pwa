import { AxiosInstance } from "axios";
import { Repository, Branch, Commit, TreeEntry, AzureListResponse } from "@/types";
import { isDemoClient } from "@/lib/api/client";
import { demoApi } from "@/lib/mocks/demoData";
import { getImageMimeType } from "@/lib/utils/fileTypes";

/** Git-Aenderungseintrag wie er von Diffs und Commit-Changes-APIs geliefert wird. */
export interface GitChangeEntry {
  changeType: string;
  item: {
    path: string;
    gitObjectType?: "blob" | "tree";
  };
  originalPath?: string;
}

/**
 * Konvertiert einen ArrayBuffer in einen Base64-String.
 * Nutzt den Node.js Buffer wenn verfuegbar, andernfalls eine chunk-basierte
 * Fallback-Implementierung fuer den Browser.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export const repositoriesService = {
  /** Gibt alle Git-Repositories eines Projekts zurueck. */
  async listRepositories(client: AxiosInstance, project: string): Promise<Repository[]> {
    if (isDemoClient(client)) {
      return demoApi.repositories.listRepositories();
    }

    const res = await client.get<AzureListResponse<Repository>>(
      `/${project}/_apis/git/repositories?api-version=7.1`
    );
    return res.data.value;
  },

  /** Gibt alle Branches eines Repositories zurueck (ohne `refs/heads/` Praefix). */
  async getBranches(client: AxiosInstance, project: string, repoId: string): Promise<Branch[]> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getBranches(repoId);
    }

    const res = await client.get<AzureListResponse<Branch>>(
      `/${project}/_apis/git/repositories/${repoId}/refs?filter=heads/&api-version=7.1`
    );
    return res.data.value.map((b) => ({
      ...b,
      name: b.name.replace("refs/heads/", ""),
    }));
  },

  /**
   * Erstellt einen neuen Branch ausgehend vom angegebenen Commit.
   * @param newBranchName Name des neuen Branches (ohne `refs/heads/` Praefix)
   * @param sourceObjectId Commit-ID des Ausgangspunkts
   */
  async createBranch(
    client: AxiosInstance,
    project: string,
    repoId: string,
    newBranchName: string,
    sourceObjectId: string
  ): Promise<void> {
    if (isDemoClient(client)) {
      return demoApi.repositories.createBranch(repoId, newBranchName, sourceObjectId);
    }

    const res = await client.post<{ value: Array<{ success: boolean; updateStatus?: string }> }>(
      `/${project}/_apis/git/repositories/${repoId}/refs?api-version=7.1`,
      [{
        name: `refs/heads/${newBranchName}`,
        newObjectId: sourceObjectId,
        oldObjectId: "0000000000000000000000000000000000000000",
      }]
    );

    const result = res.data.value?.[0];
    if (result && result.success === false) {
      throw new Error(result.updateStatus || "Branch konnte nicht erstellt werden.");
    }
  },

  /** Gibt alle Tags eines Repositories zurueck (ohne `refs/tags/` Praefix). */
  async getTags(client: AxiosInstance, project: string, repoId: string): Promise<Branch[]> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getTags(repoId);
    }

    const res = await client.get<AzureListResponse<Branch>>(
      `/${project}/_apis/git/repositories/${repoId}/refs?filter=tags/&api-version=7.1`
    );
    return res.data.value.map((t) => ({
      ...t,
      name: t.name.replace("refs/tags/", ""),
    }));
  },

  /**
   * Gibt Commits eines Branches zurueck, optional gefiltert nach Dateipfad.
   * @param top Maximale Anzahl Commits (Standard: 30)
   */
  async getCommits(
    client: AxiosInstance,
    project: string,
    repoId: string,
    branch: string,
    top = 30,
    filePath?: string
  ): Promise<Commit[]> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getCommits(repoId, branch, top, filePath);
    }

    const params = new URLSearchParams({
      "searchCriteria.itemVersion.version": branch,
      "$top": String(top),
      "api-version": "7.1",
    });
    if (filePath) params.set("searchCriteria.itemPath", filePath);

    const res = await client.get<AzureListResponse<Commit>>(
      `/${project}/_apis/git/repositories/${repoId}/commits?${params.toString()}`
    );
    return res.data.value;
  },

  /**
   * Gibt den Commit-Diff zwischen zwei Branches zurueck
   * (gemeinsame Basis, Commits und geaenderte Dateien).
   */
  async getBranchDiff(
    client: AxiosInstance,
    project: string,
    repoId: string,
    baseBranch: string,
    targetBranch: string
  ): Promise<{ commits: Commit[]; changes: GitChangeEntry[]; commonCommit: string }> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getBranchDiff(repoId, baseBranch, targetBranch);
    }

    const params = new URLSearchParams({
      "baseVersion": baseBranch,
      "baseVersionType": "branch",
      "targetVersion": targetBranch,
      "targetVersionType": "branch",
      "$top": "30",
      "api-version": "7.1",
    });
    const res = await client.get<{ commits: Commit[]; changes: GitChangeEntry[]; commonCommit: string }>(
      `/${project}/_apis/git/repositories/${repoId}/diffs/commits?${params.toString()}`
    );
    return res.data;
  },

  /**
   * Gibt den Inhalt eines Verzeichnisses (eine Ebene tief) zurueck.
   * @param path Pfad im Repository (Standard: "/")
   */
  async getTree(
    client: AxiosInstance,
    project: string,
    repoId: string,
    branch: string,
    path = "/"
  ): Promise<TreeEntry[]> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getTree(repoId, branch, path);
    }

    const version = encodeURIComponent(branch);
    const scopePath = encodeURIComponent(path);
    const res = await client.get<AzureListResponse<TreeEntry>>(
      `/${project}/_apis/git/repositories/${repoId}/items?scopePath=${scopePath}&versionDescriptor.version=${version}&recursionLevel=oneLevel&api-version=7.1`
    );
    return res.data.value.filter((item) => item.path !== path);
  },

  /** Laedt den Textinhalt einer Datei fuer einen Branch. Delegates an `getFileContentAtVersion`. */
  async getFileContent(
    client: AxiosInstance,
    project: string,
    repoId: string,
    path: string,
    branch: string
  ): Promise<string> {
    return repositoriesService.getFileContentAtVersion(client, project, repoId, path, branch, "branch");
  },

  /**
   * Laedt den Textinhalt einer Datei fuer einen bestimmten Branch oder Commit.
   * @param versionOptions "previous" ruft den Zustand vor diesem Commit ab
   */
  async getFileContentAtVersion(
    client: AxiosInstance,
    project: string,
    repoId: string,
    path: string,
    version: string,
    versionType: "branch" | "commit",
    versionOptions?: "previous"
  ): Promise<string> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getFileContentAtVersion(
        repoId,
        path,
        version,
        versionType,
        versionOptions
      );
    }

    const params = new URLSearchParams({
      path,
      "versionDescriptor.version": version,
      "versionDescriptor.versionType": versionType,
      "api-version": "7.1",
    });
    if (versionOptions === "previous") {
      params.set("versionDescriptor.versionOptions", "Previous");
    }

    const res = await client.get(
      `/${project}/_apis/git/repositories/${repoId}/items?${params.toString()}`,
      { responseType: "text", headers: { Accept: "text/plain" } }
    );
    return res.data;
  },

  /**
   * Laedt Binaerdaten (Bild, etc.) als Base64-Data-URL.
   * Wird fuer die Anzeige von Bildern im Explorer verwendet.
   */
  async getFileBinaryDataUrlAtVersion(
    client: AxiosInstance,
    project: string,
    repoId: string,
    path: string,
    version: string,
    versionType: "branch" | "commit",
    versionOptions?: "previous"
  ): Promise<string> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getFileBinaryDataUrlAtVersion(
        repoId,
        path,
        version,
        versionType,
        versionOptions
      );
    }

    const params = new URLSearchParams({
      path,
      "versionDescriptor.version": version,
      "versionDescriptor.versionType": versionType,
      "api-version": "7.1",
    });
    if (versionOptions === "previous") {
      params.set("versionDescriptor.versionOptions", "Previous");
    }

    const response = await client.get<ArrayBuffer>(
      `/${project}/_apis/git/repositories/${repoId}/items?${params.toString()}`,
      { responseType: "arraybuffer", headers: { Accept: "*/*" } }
    );

    const mimeType = getImageMimeType(path) || "application/octet-stream";
    const base64 = arrayBufferToBase64(response.data);
    return `data:${mimeType};base64,${base64}`;
  },

  /** Gibt alle geaenderten Dateien eines einzelnen Commits zurueck. */
  async getCommitChanges(
    client: AxiosInstance,
    project: string,
    repoId: string,
    commitId: string
  ): Promise<GitChangeEntry[]> {
    if (isDemoClient(client)) {
      return demoApi.repositories.getCommitChanges(repoId, commitId);
    }

    const res = await client.get<{ changes: GitChangeEntry[] }>(
      `/${project}/_apis/git/repositories/${repoId}/commits/${commitId}/changes?api-version=7.1`
    );
    return res.data.changes || [];
  },

  /**
   * Committet eine Dateiinhalt-Aenderung direkt per Push-API.
   * Funktioniert fuer bestehende Dateien (edit) und neue Dateien (add).
   * @param changeType "edit" fuer bestehende, "add" fuer neue Dateien
   */
  // Dateiinhalt per Push API committen oder neue Datei anlegen
  async pushFileChange(
    client: AxiosInstance,
    project: string,
    repoId: string,
    branchName: string,
    oldObjectId: string,
    filePath: string,
    newContent: string,
    commitMessage: string,
    parentCommitId?: string,
    changeType: "edit" | "add" = "edit"
  ): Promise<void> {
    if (isDemoClient(client)) {
      return demoApi.repositories.pushFileChange(
        repoId,
        branchName,
        oldObjectId,
        filePath,
        newContent,
        commitMessage,
        parentCommitId,
        changeType
      );
    }

    // Inhalt als base64 kodieren (UTF-8-sicher via TextEncoder)
    const bytes = new TextEncoder().encode(newContent);
    const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
    const base64Content = btoa(binary);

    const commitPayload: {
      comment: string;
      parents?: string[];
      changes: object[];
    } = {
      comment: commitMessage,
      changes: [
        {
          changeType,
          item: { path: filePath },
          newContent: { content: base64Content, contentType: "base64Encoded" },
        },
      ],
    };

    // Bei neuem Branch muss der Ausgangs-Commit als parent angegeben werden
    if (parentCommitId) {
      commitPayload.parents = [parentCommitId];
    }

    await client.post(
      `/${project}/_apis/git/repositories/${repoId}/pushes?api-version=7.1`,
      {
        refUpdates: [{ name: `refs/heads/${branchName}`, oldObjectId }],
        commits: [commitPayload],
      }
    );
  },
};
