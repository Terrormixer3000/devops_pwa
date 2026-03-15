"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { repositoriesService, GitChangeEntry } from "@/lib/services/repositoriesService";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { searchService, CodeSearchResult } from "@/lib/services/searchService";
import { createSearchClient } from "@/lib/api/client";
import { getChangeKey } from "@/lib/utils/gitUtils";
import { isImagePath } from "@/lib/utils/fileTypes";
import type { AppSettings, Branch, Commit, Repository, TreeEntry } from "@/types";

/**
 * Aktive Ansicht im Repo-Explorer.
 * Steuert, welches Sub-Panel sichtbar ist.
 */
export type ActiveView =
  | "branches"
  | "commits"
  | "commit-diff"
  | "files"
  | "file-content"
  | "file-history"
  | "compare"
  | "search";

/** Gesamter State, Queries und Handler für den Repo-Explorer. */
export function useRepoExplorer(repo: Repository, settings: AppSettings) {
  const [view, setView] = useState<ActiveView>("branches");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [selectedCommitChangeKey, setSelectedCommitChangeKey] = useState<string | null>(null);
  const [compareBranch, setCompareBranch] = useState<Branch | null>(null);
  const [fileHistoryFile, setFileHistoryFile] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [commitSheetOpen, setCommitSheetOpen] = useState(false);
  const [newFileSheetOpen, setNewFileSheetOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CodeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { client } = useAzureClient();
  const queryClient = useQueryClient();

  // Search-Client fuer die almsearch-API
  const searchClient = useMemo(() => createSearchClient(settings), [settings]);

  const { data: tags, isLoading: tagsLoading, error: tagError } = useQuery({
    queryKey: ["tags", repo.id, settings.project, settings.demoMode],
    queryFn: () =>
      client ? repositoriesService.getTags(client, settings.project, repo.id) : Promise.resolve([]),
    enabled: !!client,
  });

  const { data: fileHistoryCommits, isLoading: fileHistoryLoading } = useQuery({
    queryKey: ["file-history", repo.id, selectedBranch?.name, fileHistoryFile, settings.project, settings.demoMode],
    queryFn: () =>
      client && selectedBranch && fileHistoryFile
        ? repositoriesService.getCommits(client, settings.project, repo.id, selectedBranch.name, 30, fileHistoryFile)
        : Promise.resolve([]),
    enabled: !!client && !!selectedBranch && !!fileHistoryFile && view === "file-history",
  });

  const { data: branchDiff, isLoading: branchDiffLoading } = useQuery({
    queryKey: ["branch-diff", repo.id, selectedBranch?.name, compareBranch?.name, settings.project, settings.demoMode],
    queryFn: () =>
      client && selectedBranch && compareBranch
        ? repositoriesService.getBranchDiff(client, settings.project, repo.id, selectedBranch.name, compareBranch.name)
        : Promise.resolve({ commits: [], changes: [], commonCommit: "" }),
    enabled: !!client && !!selectedBranch && !!compareBranch && view === "compare",
  });

  const {
    data: branches,
    isLoading: branchesLoading,
    error: branchError,
    refetch: refetchBranches,
  } = useQuery({
    queryKey: ["branches", repo.id, settings.project, settings.demoMode],
    queryFn: () =>
      client ? repositoriesService.getBranches(client, settings.project, repo.id) : Promise.resolve([]),
    enabled: !!client,
  });

  const { data: commits, isLoading: commitsLoading } = useQuery({
    queryKey: ["commits", repo.id, selectedBranch?.name, settings.project, settings.demoMode],
    queryFn: () =>
      client && selectedBranch
        ? repositoriesService.getCommits(client, settings.project, repo.id, selectedBranch.name)
        : Promise.resolve([]),
    enabled: !!client && !!selectedBranch && view === "commits",
  });

  const { data: treeItems, isLoading: treeLoading } = useQuery({
    queryKey: ["tree", repo.id, selectedBranch?.name, currentPath, settings.project, settings.demoMode],
    queryFn: () =>
      client && selectedBranch
        ? repositoriesService.getTree(client, settings.project, repo.id, selectedBranch.name, currentPath)
        : Promise.resolve([]),
    enabled: !!client && !!selectedBranch && view === "files",
  });

  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ["file", repo.id, selectedBranch?.name, selectedFile, settings.project, settings.demoMode],
    queryFn: async () => {
      if (!client || !selectedBranch || !selectedFile) {
        return { content: "", imageDataUrl: null as string | null, error: null as string | null };
      }
      try {
        if (isImagePath(selectedFile)) {
          const imageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(
            client, settings.project, repo.id, selectedFile, selectedBranch.name, "branch"
          );
          return { content: "", imageDataUrl, error: null as string | null };
        }
        const content = await repositoriesService.getFileContent(
          client, settings.project, repo.id, selectedFile, selectedBranch.name
        );
        return { content, imageDataUrl: null as string | null, error: null as string | null };
      } catch (err) {
        return {
          content: "",
          imageDataUrl: null as string | null,
          error: (err instanceof Error ? err.message : null) || "Datei konnte nicht geladen werden.",
        };
      }
    },
    enabled: !!client && !!selectedBranch && view === "file-content" && !!selectedFile,
  });

  const { data: commitChanges, isLoading: commitChangesLoading } = useQuery({
    queryKey: ["commit-changes", repo.id, selectedCommit?.commitId, settings.project, settings.demoMode],
    queryFn: () =>
      client && selectedCommit
        ? repositoriesService.getCommitChanges(client, settings.project, repo.id, selectedCommit.commitId)
        : Promise.resolve([]),
    enabled: !!client && !!selectedCommit && view === "commit-diff",
  });

  const commitChangeEntries = commitChanges || [];
  const selectedCommitChange =
    commitChangeEntries.find((entry) => getChangeKey(entry) === selectedCommitChangeKey) ||
    commitChangeEntries[0] ||
    null;
  const selectedCommitChangePath =
    selectedCommitChange?.item.path || selectedCommitChange?.originalPath || "";
  const selectedCommitChangeIsImage = isImagePath(selectedCommitChangePath);

  const { data: commitFileDiff, isLoading: commitFileDiffLoading } = useQuery({
    queryKey: [
      "commit-file-diff",
      repo.id,
      selectedCommit?.commitId,
      selectedCommitChange?.changeType,
      selectedCommitChange?.originalPath,
      selectedCommitChange?.item.path,
      settings.project,
      settings.demoMode,
    ],
    queryFn: async () => {
      if (!client || !selectedCommit || !selectedCommitChange) {
        return {
          oldContent: "", newContent: "",
          oldImageDataUrl: null as string | null, newImageDataUrl: null as string | null,
          error: null as string | null,
        };
      }
      const changeType = selectedCommitChange.changeType.toLowerCase();
      const oldPath = selectedCommitChange.originalPath || selectedCommitChange.item.path;
      const newPath = selectedCommitChange.item.path;
      const loadOld = changeType !== "add";
      const loadNew = changeType !== "delete";
      let oldContent = "";
      let newContent = "";
      let oldImageDataUrl: string | null = null;
      let newImageDataUrl: string | null = null;

      try {
        if (loadOld) {
          if (selectedCommitChangeIsImage) {
            oldImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(
              client, settings.project, repo.id, oldPath, selectedCommit.commitId, "commit", "previous"
            );
          } else {
            oldContent = await repositoriesService.getFileContentAtVersion(
              client, settings.project, repo.id, oldPath, selectedCommit.commitId, "commit", "previous"
            );
          }
        }
      } catch (err) {
        if (loadOld) {
          return {
            oldContent: "", newContent: "", oldImageDataUrl: null as string | null,
            newImageDataUrl: null as string | null,
            error: (err instanceof Error ? err.message : null) || "Vorherige Dateiversion konnte nicht geladen werden.",
          };
        }
      }

      try {
        if (loadNew) {
          if (selectedCommitChangeIsImage) {
            newImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(
              client, settings.project, repo.id, newPath, selectedCommit.commitId, "commit"
            );
          } else {
            newContent = await repositoriesService.getFileContentAtVersion(
              client, settings.project, repo.id, newPath, selectedCommit.commitId, "commit"
            );
          }
        }
      } catch (err) {
        if (loadNew) {
          return {
            oldContent, newContent: "", oldImageDataUrl,
            newImageDataUrl: null as string | null,
            error: (err instanceof Error ? err.message : null) || "Aktuelle Dateiversion konnte nicht geladen werden.",
          };
        }
      }

      return { oldContent, newContent, oldImageDataUrl, newImageDataUrl, error: null as string | null };
    },
    enabled: !!client && !!selectedCommit && !!selectedCommitChange && view === "commit-diff",
  });

  // --- Handler ---

  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setCurrentPath("/");
    setPathHistory([]);
    setSelectedFile(null);
    setSelectedCommit(null);
    setSelectedCommitChangeKey(null);
    setCompareBranch(null);
    setFileHistoryFile(null);
    setEditMode(false);
    setEditedContent(null);
    setView("files");
  };

  const handleSaveFile = async (
    content: string,
    commitMessage: string,
    targetMode: "current" | "new-branch",
    newBranchName: string,
    createPR: boolean,
    prTitle: string
  ) => {
    if (!client || !selectedBranch || !selectedFile) throw new Error("Kein Client oder keine Datei");
    const sourceBranchObjectId = selectedBranch.objectId;

    if (targetMode === "current") {
      await repositoriesService.pushFileChange(
        client, settings.project, repo.id, selectedBranch.name,
        sourceBranchObjectId, selectedFile, content, commitMessage
      );
    } else {
      await repositoriesService.pushFileChange(
        client, settings.project, repo.id, newBranchName,
        "0000000000000000000000000000000000000000",
        selectedFile, content, commitMessage, sourceBranchObjectId
      );
      if (createPR) {
        await pullRequestsService.create(client, settings.project, repo.id, {
          title: prTitle || commitMessage,
          sourceRefName: `refs/heads/${newBranchName}`,
          targetRefName: `refs/heads/${selectedBranch.name}`,
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["file", repo.id, selectedBranch.name, selectedFile] });
    setEditMode(false);
    setEditedContent(null);
    setCommitSheetOpen(false);
    const msg =
      targetMode === "current"
        ? `Commit auf "${selectedBranch.name}" erstellt.`
        : createPR
        ? `Branch "${newBranchName}" erstellt und PR geöffnet.`
        : `Branch "${newBranchName}" erstellt.`;
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const handleCreateFile = async (
    content: string,
    commitMessage: string,
    targetMode: "current" | "new-branch",
    newBranchName: string,
    createPR: boolean,
    prTitle: string,
    filePath: string
  ) => {
    if (!client || !selectedBranch) throw new Error("Kein Client oder Branch");
    const sourceBranchObjectId = selectedBranch.objectId;

    if (targetMode === "current") {
      await repositoriesService.pushFileChange(
        client, settings.project, repo.id, selectedBranch.name,
        sourceBranchObjectId, filePath, content, commitMessage, undefined, "add"
      );
    } else {
      await repositoriesService.pushFileChange(
        client, settings.project, repo.id, newBranchName,
        "0000000000000000000000000000000000000000",
        filePath, content, commitMessage, sourceBranchObjectId, "add"
      );
      if (createPR) {
        await pullRequestsService.create(client, settings.project, repo.id, {
          title: prTitle || commitMessage,
          sourceRefName: `refs/heads/${newBranchName}`,
          targetRefName: `refs/heads/${selectedBranch.name}`,
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["tree", repo.id, selectedBranch.name, currentPath] });
    setNewFileSheetOpen(false);
    const msg =
      targetMode === "current"
        ? `Datei "${filePath}" erstellt.`
        : createPR
        ? `Branch "${newBranchName}" mit Datei erstellt und PR geöffnet.`
        : `Branch "${newBranchName}" mit Datei erstellt.`;
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  // Mutation: Datei loeschen
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!client || !selectedBranch || !selectedFile) throw new Error("Kein Client oder keine Datei");
      const commitMessage = `Datei ${selectedFile} gelöscht`;
      await repositoriesService.deleteFile(
        client,
        settings.project,
        repo.id,
        selectedFile,
        selectedBranch.name,
        commitMessage,
        selectedBranch.objectId
      );
    },
    onSuccess: async () => {
      if (selectedBranch) {
        await queryClient.invalidateQueries({ queryKey: ["tree", repo.id, selectedBranch.name, currentPath] });
      }
      setSelectedFile(null);
      setView("files");
    },
  });

  // Mutation: Datei umbenennen
  const renameMutation = useMutation({
    mutationFn: async (newPath: string) => {
      if (!client || !selectedBranch || !selectedFile) throw new Error("Kein Client oder keine Datei");
      const commitMessage = `${selectedFile} umbenannt in ${newPath}`;
      await repositoriesService.renameFile(
        client,
        settings.project,
        repo.id,
        selectedFile,
        newPath,
        selectedBranch.name,
        commitMessage,
        selectedBranch.objectId
      );
    },
    onSuccess: async (_, newPath) => {
      if (selectedBranch) {
        await queryClient.invalidateQueries({ queryKey: ["tree", repo.id, selectedBranch.name, currentPath] });
      }
      setSelectedFile(newPath);
    },
  });

  const handleDeleteFile = () => {
    deleteMutation.mutate();
  };

  const handleRenameFile = (newPath: string) => {
    renameMutation.mutate(newPath);
  };

  // Suche ausfuehren und Ergebnisse im State speichern
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchService.searchCode(
        searchClient,
        settings.project,
        repo.name,
        query
      );
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setView("search");
  };

  const handleOpenFileHistory = (filePath: string) => {
    setFileHistoryFile(filePath);
    setView("file-history");
  };

  const handleOpenCompare = (targetBranch: Branch) => {
    setCompareBranch(targetBranch);
    setView("compare");
  };

  const handleCreateBranch = async (branchName: string, sourceObjectId: string): Promise<void> => {
    if (!client) throw new Error("Kein Client");
    await repositoriesService.createBranch(client, settings.project, repo.id, branchName, sourceObjectId);
    refetchBranches();
  };

  const handleNavigateFolder = (entry: TreeEntry) => {
    setPathHistory((history) => [...history, currentPath]);
    setCurrentPath(entry.path);
  };

  const handleBack = () => {
    if (view === "commit-diff") {
      setView("commits");
      setSelectedCommit(null);
      setSelectedCommitChangeKey(null);
      return;
    }
    if (view === "commits") { setView("files"); return; }
    if (view === "file-history") { setView("file-content"); setFileHistoryFile(null); return; }
    if (view === "compare") { setView("branches"); setCompareBranch(null); return; }
    if (view === "search") { setView("files"); setSearchQuery(""); setSearchResults([]); return; }

    const prev = pathHistory[pathHistory.length - 1] || "/";
    setPathHistory((history) => history.slice(0, -1));
    setCurrentPath(prev);
    if (view === "file-content") { setView("files"); setSelectedFile(null); }
  };

  const handleOpenFile = (entry: TreeEntry) => {
    setSelectedFile(entry.path);
    setView("file-content");
  };

  // Datei per Pfad-String oeffnen (z.B. aus Suchergebnissen)
  const handleOpenFileByPath = (filePath: string) => {
    setSelectedFile(filePath);
    setView("file-content");
  };

  const handleOpenCommit = (commit: Commit) => {
    setSelectedCommit(commit);
    setSelectedCommitChangeKey(null);
    setView("commit-diff");
  };

  return {
    // view state
    view, setView,
    selectedBranch,
    currentPath,
    pathHistory,
    selectedFile,
    selectedCommit,
    selectedCommitChangeKey, setSelectedCommitChangeKey,
    compareBranch,
    fileHistoryFile,
    editMode, setEditMode,
    editedContent, setEditedContent,
    commitSheetOpen, setCommitSheetOpen,
    newFileSheetOpen, setNewFileSheetOpen,
    saveSuccess,
    searchQuery,
    searchResults,
    isSearching,
    isDeletingFile: deleteMutation.isPending,
    deleteFileError: deleteMutation.error instanceof Error ? deleteMutation.error.message : null,
    isRenamingFile: renameMutation.isPending,
    renameFileError: renameMutation.error instanceof Error ? renameMutation.error.message : null,

    // query data
    tags: tags || [],
    branches: branches || [],
    commits: commits || [],
    treeItems: treeItems || [],
    fileContent,
    fileHistoryCommits: fileHistoryCommits || [],
    branchDiff,
    commitChanges: commitChangeEntries,
    commitFileDiff,
    selectedCommitChange,

    // loading / error
    branchesLoading,
    tagsLoading,
    commitsLoading,
    treeLoading,
    fileLoading,
    fileHistoryLoading,
    branchDiffLoading,
    commitChangesLoading,
    commitFileDiffLoading,
    branchError,
    tagError,

    // handlers
    handleSelectBranch,
    handleSaveFile,
    handleCreateFile,
    handleOpenFileHistory,
    handleOpenCompare,
    handleCreateBranch,
    handleNavigateFolder,
    handleBack,
    handleOpenFile,
    handleOpenFileByPath,
    handleOpenCommit,
    handleSearch,
    handleOpenSearch,
    handleDeleteFile,
    handleRenameFile,
    refetchBranches,
  };
}
