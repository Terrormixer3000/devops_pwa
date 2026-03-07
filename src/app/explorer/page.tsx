"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { repositoriesService, GitChangeEntry } from "@/lib/services/repositoriesService";
import { CodeRepoSelector } from "@/components/layout/selectors/CodeRepoSelector";
import { AppSettings, Branch, Commit, Repository, TreeEntry } from "@/types";
import { RichDiffViewer } from "@/components/ui/RichDiffViewer";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { BackActionButton } from "@/components/ui/BackButton";
import { isImagePath, isMarkdownPath } from "@/lib/utils/fileTypes";
import { buildImageTextRepresentation } from "@/lib/utils/imageText";
import {
  FolderGit2,
  Folder,
  FileText,
  ChevronRight,
  GitBranch,
  GitCommit,
  Tag,
  History,
  GitCompare,
  Plus,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type ActiveView = "branches" | "commits" | "commit-diff" | "files" | "file-content" | "file-history" | "compare";

function getChangeKey(entry: GitChangeEntry): string {
  return `${entry.changeType}::${entry.originalPath || ""}::${entry.item.path}`;
}

export default function ExplorerPage() {
  const { settings } = useSettingsStore();
  const { selectedRepositories } = useRepositoryStore();
  const { client } = useAzureClient();
  // Code Explorer nutzt immer nur ein einzelnes Repository
  const repo = selectedRepositories[0];

  return (
    <div className="min-h-screen">
      <AppBar title="Code Explorer" rightSlot={<CodeRepoSelector />} />
      {!repo ? (
        <EmptyState icon={FolderGit2} title="Kein Repository ausgewaehlt" description="Waehle ein Repository in der oberen Leiste" />
      ) : null}
      {repo && settings && client ? (
        <RepoExplorer key={repo.id} repo={repo} settings={settings} />
      ) : null}
    </div>
  );
}

function RepoExplorer({ repo, settings }: { repo: Repository; settings: AppSettings }) {
  const [view, setView] = useState<ActiveView>("branches");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [selectedCommitChangeKey, setSelectedCommitChangeKey] = useState<string | null>(null);
  const [compareBranch, setCompareBranch] = useState<Branch | null>(null);
  const [fileHistoryFile, setFileHistoryFile] = useState<string | null>(null);
  const { client } = useAzureClient();

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

  const { data: branches, isLoading: branchesLoading, error: branchError, refetch: refetchBranches } = useQuery({
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
            client,
            settings.project,
            repo.id,
            selectedFile,
            selectedBranch.name,
            "branch"
          );
          return { content: "", imageDataUrl, error: null as string | null };
        }

        const content = await repositoriesService.getFileContent(
          client,
          settings.project,
          repo.id,
          selectedFile,
          selectedBranch.name
        );
        return { content, imageDataUrl: null as string | null, error: null as string | null };
      } catch {
        return {
          content: "",
          imageDataUrl: null as string | null,
          error: "Datei konnte nicht geladen werden.",
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
          oldContent: "",
          newContent: "",
          oldImageDataUrl: null as string | null,
          newImageDataUrl: null as string | null,
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
              client,
              settings.project,
              repo.id,
              oldPath,
              selectedCommit.commitId,
              "commit",
              "previous"
            );
          } else {
            oldContent = await repositoriesService.getFileContentAtVersion(
              client,
              settings.project,
              repo.id,
              oldPath,
              selectedCommit.commitId,
              "commit",
              "previous"
            );
          }
        }
      } catch {
        if (loadOld) {
          return {
            oldContent: "",
            newContent: "",
            oldImageDataUrl: null as string | null,
            newImageDataUrl: null as string | null,
            error: "Vorherige Dateiversion konnte nicht geladen werden.",
          };
        }
      }

      try {
        if (loadNew) {
          if (selectedCommitChangeIsImage) {
            newImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(
              client,
              settings.project,
              repo.id,
              newPath,
              selectedCommit.commitId,
              "commit"
            );
          } else {
            newContent = await repositoriesService.getFileContentAtVersion(
              client,
              settings.project,
              repo.id,
              newPath,
              selectedCommit.commitId,
              "commit"
            );
          }
        }
      } catch {
        if (loadNew) {
          return {
            oldContent,
            newContent: "",
            oldImageDataUrl,
            newImageDataUrl: null as string | null,
            error: "Aktuelle Dateiversion konnte nicht geladen werden.",
          };
        }
      }

      return { oldContent, newContent, oldImageDataUrl, newImageDataUrl, error: null as string | null };
    },
    enabled: !!client && !!selectedCommit && !!selectedCommitChange && view === "commit-diff",
  });

  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setCurrentPath("/");
    setPathHistory([]);
    setSelectedFile(null);
    setSelectedCommit(null);
    setSelectedCommitChangeKey(null);
    setCompareBranch(null);
    setFileHistoryFile(null);
    setView("files");
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
    if (!client || !settings) throw new Error("Kein Client");
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

    if (view === "commits") {
      setView("files");
      return;
    }

    if (view === "file-history") {
      setView("file-content");
      setFileHistoryFile(null);
      return;
    }

    if (view === "compare") {
      setView("branches");
      setCompareBranch(null);
      return;
    }

    const prev = pathHistory[pathHistory.length - 1] || "/";
    setPathHistory((history) => history.slice(0, -1));
    setCurrentPath(prev);
    if (view === "file-content") {
      setView("files");
      setSelectedFile(null);
    }
  };

  const handleOpenFile = (entry: TreeEntry) => {
    setSelectedFile(entry.path);
    setView("file-content");
  };

  const handleOpenCommit = (commit: Commit) => {
    setSelectedCommit(commit);
    setSelectedCommitChangeKey(null);
    setView("commit-diff");
  };

  return (
    <>
      {selectedBranch && (
        <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {(view === "commits" || view === "commit-diff" || view === "file-content" || view === "file-history" || view === "compare" || pathHistory.length > 0) && (
              <BackActionButton
                onClick={handleBack}
                iconOnly
                size="compact"
                className="flex-shrink-0"
              />
            )}
            <button onClick={() => setView("branches")} className="flex items-center gap-1 text-xs text-blue-400 flex-shrink-0">
              <GitBranch size={12} />
              <span>{selectedBranch.name}</span>
            </button>
            <div className="flex items-center gap-1 ml-auto">
              {(["files", "commits", "compare"] as const).map((entry) => {
                const isActive =
                  entry === "files" ? (view === "files" || view === "file-content" || view === "file-history") :
                  entry === "commits" ? (view === "commits" || view === "commit-diff") :
                  view === "compare";
                const labels: Record<string, string> = { files: "Dateien", commits: "Commits", compare: "Vergleich" };
                return (
                  <button
                    key={entry}
                    onClick={() => {
                      if (entry === "compare" && !compareBranch) {
                        setView("branches");
                      } else {
                        setView(entry);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {labels[entry]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={selectedBranch ? "pt-[3.85rem]" : ""}>
        {view === "branches" ? (
          <BranchList
            branches={branches || []}
            tags={tags || []}
            loading={branchesLoading || tagsLoading}
            error={branchError || tagError}
            onSelect={handleSelectBranch}
            onCompare={handleOpenCompare}
            onRefetch={refetchBranches}
            onCreateBranch={handleCreateBranch}
          />
        ) : view === "commits" ? (
          <CommitList commits={commits || []} loading={commitsLoading} onSelect={handleOpenCommit} />
        ) : view === "commit-diff" ? (
          <CommitDiffView
            commit={selectedCommit}
            changes={commitChanges || []}
            changesLoading={commitChangesLoading}
            selectedChange={selectedCommitChange}
            onSelectChange={(change) => setSelectedCommitChangeKey(getChangeKey(change))}
            diff={commitFileDiff}
            diffLoading={commitFileDiffLoading}
          />
        ) : view === "files" ? (
          <FileTree items={treeItems || []} loading={treeLoading} currentPath={currentPath} onFolder={handleNavigateFolder} onFile={handleOpenFile} />
        ) : view === "file-history" ? (
          <FileHistoryView
            filePath={fileHistoryFile || ""}
            commits={fileHistoryCommits || []}
            loading={fileHistoryLoading}
            onSelectCommit={handleOpenCommit}
          />
        ) : view === "compare" ? (
          <BranchCompareView
            baseBranch={selectedBranch?.name || ""}
            targetBranch={compareBranch?.name || ""}
            diff={branchDiff}
            loading={branchDiffLoading}
          />
        ) : (
          <FileViewer
            key={selectedFile || "file-viewer"}
            content={fileContent?.content || ""}
            imageDataUrl={fileContent?.imageDataUrl || null}
            error={fileContent?.error}
            path={selectedFile || ""}
            loading={fileLoading}
            onOpenHistory={handleOpenFileHistory}
          />
        )}
      </div>
    </>
  );
}

// Branch-Liste
function BranchList({ branches, tags, loading, error, onSelect, onCompare, onRefetch, onCreateBranch }: {
  branches: Branch[];
  tags: Branch[];
  loading: boolean;
  error: unknown;
  onSelect: (b: Branch) => void;
  onCompare: (b: Branch) => void;
  onRefetch: () => void;
  onCreateBranch: (branchName: string, sourceObjectId: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"branches" | "tags">("branches");
  const items = mode === "branches" ? branches : tags;

  const [createOpen, setCreateOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [sourceMode, setSourceMode] = useState<"branch" | "commit">("branch");
  const [sourceBranchName, setSourceBranchName] = useState("");
  const [sourceCommitHash, setSourceCommitHash] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setNewBranchName("");
    setSourceMode("branch");
    setSourceBranchName("");
    setSourceCommitHash("");
    setCreateError(null);
  };

  const handleCloseModal = () => {
    setCreateOpen(false);
    resetForm();
  };

  const isSubmitDisabled =
    createPending ||
    !newBranchName.trim() ||
    (sourceMode === "branch" ? !sourceBranchName : !sourceCommitHash.trim());

  const handleCreateSubmit = async () => {
    const trimmedName = newBranchName.trim();
    if (!trimmedName) {
      setCreateError("Branch-Name darf nicht leer sein.");
      return;
    }

    let sourceObjectId = "";
    if (sourceMode === "branch") {
      const sourceBranch = branches.find((b) => b.name === sourceBranchName);
      if (!sourceBranch) {
        setCreateError("Quell-Branch nicht gefunden.");
        return;
      }
      sourceObjectId = sourceBranch.objectId;
    } else {
      const hash = sourceCommitHash.trim();
      if (!hash) {
        setCreateError("Commit-Hash darf nicht leer sein.");
        return;
      }
      sourceObjectId = hash;
    }

    setCreateError(null);
    setCreatePending(true);
    try {
      await onCreateBranch(trimmedName, sourceObjectId);
      setCreateOpen(false);
      resetForm();
      setSuccessMessage(`Branch "${trimmedName}" wurde erstellt.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setCreateError((err as Error).message || "Fehler beim Erstellen des Branches.");
    } finally {
      setCreatePending(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message="Branches konnten nicht geladen werden" onRetry={onRefetch} />;

  return (
    <div className={mode === "branches" ? "pb-24" : undefined}>
      {/* Branches / Tags Tab-Toggle + Create button */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800">
        {(["branches", "tags"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === tab ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "branches" ? <GitBranch size={12} /> : <Tag size={12} />}
            {tab === "branches" ? "Branches" : "Tags"}
            <span className="ml-1 text-[10px] opacity-70">{tab === "branches" ? branches.length : tags.length}</span>
          </button>
        ))}
      </div>

      {successMessage && (
        <div className="px-4 py-2 bg-green-900/30 border-b border-green-800/40 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={mode === "branches" ? GitBranch : Tag} title={mode === "branches" ? "Keine Branches gefunden" : "Keine Tags gefunden"} />
      ) : (
        <div className="divide-y divide-slate-800/50">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-0">
              <button
                onClick={() => onSelect(item)}
                className="flex-1 flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors text-left"
              >
                {mode === "branches" ? (
                  <GitBranch size={16} className="text-blue-400 flex-shrink-0" />
                ) : (
                  <Tag size={16} className="text-purple-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">{item.objectId.substring(0, 8)}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </button>
              {mode === "branches" && (
                <button
                  onClick={() => onCompare(item)}
                  title="Vergleichen"
                  className="px-3 py-3.5 text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0"
                >
                  <GitCompare size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={handleCloseModal} title="Branch erstellen">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Branch-Name *</label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, "-"))}
              placeholder="z.B. feature/mein-feature"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-slate-500">Leerzeichen werden automatisch durch - ersetzt.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Quelle</label>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
              <button
                onClick={() => setSourceMode("branch")}
                className={`rounded-[0.9rem] py-2.5 text-sm font-medium transition-colors ${
                  sourceMode === "branch"
                    ? "bg-slate-700 text-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
                    : "text-slate-400"
                }`}
              >
                Branch
              </button>
              <button
                onClick={() => setSourceMode("commit")}
                className={`rounded-[0.9rem] py-2.5 text-sm font-medium transition-colors ${
                  sourceMode === "commit"
                    ? "bg-slate-700 text-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
                    : "text-slate-400"
                }`}
              >
                Commit-Hash
              </button>
            </div>
          </div>

          {sourceMode === "branch" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Von Branch *</label>
              <select
                value={sourceBranchName}
                onChange={(e) => setSourceBranchName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Branch auswaehlen...</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Commit-Hash *</label>
              <input
                type="text"
                value={sourceCommitHash}
                onChange={(e) => setSourceCommitHash(e.target.value)}
                placeholder="z.B. a1b2c3d4e5f6..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 py-3 bg-slate-800 font-mono border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          )}

          {createError && (
            <p className="text-sm text-red-400">{createError}</p>
          )}

          <button
            onClick={handleCreateSubmit}
            disabled={isSubmitDisabled}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPending ? "Erstelle..." : "Branch erstellen"}
          </button>
        </div>
      </Modal>

      {mode === "branches" && (
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95"
          style={{ bottom: "var(--fab-bottom-offset)" }}
          aria-label="Branch erstellen"
          title="Branch erstellen"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

// Commit-Liste
function CommitList({
  commits,
  loading,
  onSelect,
}: {
  commits: ReturnType<typeof repositoriesService.getCommits> extends Promise<infer T> ? T : never;
  loading: boolean;
  onSelect: (commit: Commit) => void;
}) {
  if (loading) return <PageLoader />;
  if (!commits || commits.length === 0) return <EmptyState icon={GitCommit} title="Keine Commits gefunden" />;

  return (
    <div className="divide-y divide-slate-800/50">
      {commits.map((commit) => (
        <button
          key={commit.commitId}
          onClick={() => onSelect(commit)}
          className="w-full px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
        >
          <p className="text-sm text-slate-100 line-clamp-2">{commit.comment}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="font-mono text-blue-400">{commit.commitId.substring(0, 8)}</span>
            <span>{commit.author.name}</span>
            <span className="ml-auto">
              {formatDistanceToNow(new Date(commit.author.date), { addSuffix: true, locale: de })}
            </span>
            <ChevronRight size={14} className="text-slate-600" />
          </div>
        </button>
      ))}
    </div>
  );
}

function CommitDiffView({
  commit,
  changes,
  changesLoading,
  selectedChange,
  onSelectChange,
  diff,
  diffLoading,
}: {
  commit: Commit | null;
  changes: GitChangeEntry[];
  changesLoading: boolean;
  selectedChange: GitChangeEntry | null;
  onSelectChange: (change: GitChangeEntry) => void;
  diff?: {
    oldContent: string;
    newContent: string;
    oldImageDataUrl?: string | null;
    newImageDataUrl?: string | null;
    error: string | null;
  };
  diffLoading: boolean;
}) {
  if (!commit) return <EmptyState icon={GitCommit} title="Kein Commit ausgewaehlt" />;
  if (changesLoading) return <PageLoader />;

  const changeType = selectedChange?.changeType.toLowerCase();
  const oldPath = selectedChange?.originalPath || selectedChange?.item.path || "";
  const newPath = selectedChange?.item.path || "";

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5">
        <p className="text-xs font-mono text-blue-400">{commit.commitId.substring(0, 8)}</p>
        <p className="mt-1 text-sm text-slate-200">{commit.comment}</p>
      </div>

      {changes.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Keine Dateiaenderungen gefunden</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-700/60">
            {changes.map((change, index) => {
              const isSelected =
                selectedChange?.item.path === change.item.path &&
                selectedChange?.changeType === change.changeType &&
                (selectedChange?.originalPath || "") === (change.originalPath || "");
              return (
                <button
                  key={`${change.item.path}-${change.changeType}-${index}`}
                  onClick={() => onSelectChange(change)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/50 text-left transition-colors ${
                    isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                  }`}
                >
                  <ChangeTypeDot type={change.changeType} />
                  <span className="text-xs font-mono text-slate-300 truncate flex-1">{change.item.path}</span>
                  <ChevronRight size={14} className={`flex-shrink-0 ${isSelected ? "text-blue-400" : "text-slate-600"}`} />
                </button>
              );
            })}
          </div>

          {selectedChange && (
            <RichDiffViewer
              key={`${selectedChange.item.path}:${selectedChange.changeType}:${selectedChange.originalPath || ""}`}
              path={selectedChange.item.path}
              title={selectedChange.item.path}
              oldContent={diff?.oldContent || ""}
              newContent={diff?.newContent || ""}
              oldLabel={`prev:${oldPath}`}
              newLabel={`commit:${newPath}`}
              oldImageSrc={diff?.oldImageDataUrl || null}
              newImageSrc={diff?.newImageDataUrl || null}
              loading={diffLoading}
              error={diff?.error}
              emptyMessage={changeType === "rename" ? "Nur Umbenennung ohne Inhaltsaenderung" : "Keine zeilenbasierten Unterschiede"}
            />
          )}
        </>
      )}
    </div>
  );
}

// Dateibaum-Ansicht
function FileTree({ items, loading, currentPath, onFolder, onFile }: {
  items: TreeEntry[];
  loading: boolean;
  currentPath: string;
  onFolder: (e: TreeEntry) => void;
  onFile: (e: TreeEntry) => void;
}) {
  if (loading) return <PageLoader />;

  // Ordner zuerst sortieren
  const sorted = [...items].sort((a, b) => {
    if (a.gitObjectType === b.gitObjectType) return a.path.localeCompare(b.path);
    return a.gitObjectType === "tree" ? -1 : 1;
  });

  return (
    <div>
      {currentPath !== "/" && (
        <div className="px-4 py-2 text-xs text-slate-500 font-mono border-b border-slate-800">
          {currentPath}
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState icon={Folder} title="Leeres Verzeichnis" />
      ) : (
        <div className="divide-y divide-slate-800/50">
          {sorted.map((entry) => {
            const name = entry.path.split("/").pop() || entry.path;
            const isFolder = entry.gitObjectType === "tree";
            return (
              <button
                key={entry.path}
                onClick={() => isFolder ? onFolder(entry) : onFile(entry)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
              >
                {isFolder ? (
                  <Folder size={16} className="text-blue-400 flex-shrink-0" />
                ) : (
                  <FileText size={16} className="text-slate-500 flex-shrink-0" />
                )}
                <span className="text-sm text-slate-100 flex-1 truncate">{name}</span>
                {isFolder && <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Dateihistorie
function FileHistoryView({ filePath, commits, loading, onSelectCommit }: {
  filePath: string;
  commits: Commit[];
  loading: boolean;
  onSelectCommit: (c: Commit) => void;
}) {
  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
        <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
          <History size={12} />
          {filePath}
        </p>
      </div>
      {commits.length === 0 ? (
        <EmptyState icon={History} title="Keine Commits gefunden" />
      ) : (
        <div className="divide-y divide-slate-800/50">
          {commits.map((commit) => (
            <button
              key={commit.commitId}
              onClick={() => onSelectCommit(commit)}
              className="w-full px-4 py-3 text-left hover:bg-slate-800/30 transition-colors"
            >
              <p className="text-sm text-slate-100 line-clamp-2">{commit.comment}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span className="font-mono text-blue-400">{commit.commitId.substring(0, 8)}</span>
                <span>{commit.author.name}</span>
                <span className="ml-auto">
                  {formatDistanceToNow(new Date(commit.author.date), { addSuffix: true, locale: de })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Branch-Vergleich
function BranchCompareView({ baseBranch, targetBranch, diff, loading }: {
  baseBranch: string;
  targetBranch: string;
  diff?: { commits: Commit[]; changes: Array<{ changeType: string; item: { path: string } }>; commonCommit: string } | null;
  loading: boolean;
}) {
  if (loading) return <PageLoader />;
  if (!diff) return <EmptyState icon={GitCompare} title="Branch auswaehlen" description="Tippe auf das Vergleich-Symbol neben einem Branch" />;

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-3 py-2.5 flex items-center gap-2 text-sm">
        <GitBranch size={14} className="text-blue-400" />
        <span className="text-slate-300">{baseBranch}</span>
        <GitCompare size={14} className="text-slate-500 mx-1" />
        <GitBranch size={14} className="text-purple-400" />
        <span className="text-slate-300">{targetBranch}</span>
      </div>

      <div className="text-xs text-slate-500">
        {diff.commits.length} Commit{diff.commits.length !== 1 ? "s" : ""} voraus &middot; {diff.changes.length} Datei{diff.changes.length !== 1 ? "en" : ""} geaendert
      </div>

      {diff.changes.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-700/60">
          {diff.changes.slice(0, 30).map((change, i) => (
            <div
              key={`${change.item.path}-${i}`}
              className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/50 last:border-b-0"
            >
              <ChangeTypeDot type={change.changeType} />
              <span className="text-xs font-mono text-slate-300 truncate">{change.item.path}</span>
            </div>
          ))}
        </div>
      )}

      {diff.commits.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-700/60">
          {diff.commits.map((commit) => (
            <div key={commit.commitId} className="px-3 py-2.5 border-b border-slate-800/50 last:border-b-0">
              <p className="text-xs text-slate-200 line-clamp-1">{commit.comment}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{commit.commitId.substring(0, 8)} &middot; {commit.author.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Dateiinhalt Anzeige
function FileViewer({
  content,
  imageDataUrl,
  error,
  path,
  loading,
  onOpenHistory,
}: {
  content: string;
  imageDataUrl?: string | null;
  error?: string | null;
  path: string;
  loading: boolean;
  onOpenHistory?: (filePath: string) => void;
}) {
  const [mode, setMode] = useState<"preview" | "text">("preview");
  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} />;

  const lines = content.split("\n");
  const isImage = isImagePath(path);
  const isMarkdown = isMarkdownPath(path);
  const rawText = isImage ? buildImageTextRepresentation(imageDataUrl, path) : content;
  const rawLines = rawText.split("\n");

  return (
    <div>
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-mono text-slate-400 truncate flex-1 min-w-0">{path}</p>
        {onOpenHistory && (
          <button
            onClick={() => onOpenHistory(path)}
            title="Dateihistorie"
            className="ml-2 flex-shrink-0 flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
          >
            <History size={14} />
          </button>
        )}
      </div>

      {(isImage || isMarkdown) && (
        <div className="flex items-center justify-end px-3 py-2 border-b border-slate-800/70">
          <div className="inline-flex rounded-lg border border-slate-700/70 bg-slate-900/70 p-1">
            {[
              { key: "preview", label: "Vorschau" },
              { key: "text", label: "Text" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setMode(item.key as "preview" | "text")}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                  mode === item.key
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "preview" && isImage ? (
        <div className="p-3">
          <ImageViewer src={imageDataUrl} emptyMessage="Bild konnte nicht geladen werden" />
        </div>
      ) : mode === "preview" && isMarkdown ? (
        <div className="px-4 py-4">
          <MarkdownViewer content={content} />
        </div>
      ) : !isImage && !isMarkdown ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-slate-800/30">
                  <td className="select-none px-3 py-0.5 text-right text-slate-600 border-r border-slate-800 min-w-[48px] w-[48px]">
                    {i + 1}
                  </td>
                  <td className="px-3 py-0.5 text-slate-300 whitespace-pre">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {rawLines.map((line, i) => (
                <tr key={i} className="hover:bg-slate-800/30">
                  <td className="select-none px-3 py-0.5 text-right text-slate-600 border-r border-slate-800 min-w-[48px] w-[48px]">
                    {i + 1}
                  </td>
                  <td className="px-3 py-0.5 text-slate-300 whitespace-pre">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChangeTypeDot({ type }: { type: string }) {
  const map: Record<string, { color: string; label: string }> = {
    add: { color: "text-green-400", label: "A" },
    edit: { color: "text-blue-400", label: "M" },
    delete: { color: "text-red-400", label: "D" },
    rename: { color: "text-yellow-400", label: "R" },
  };
  const info = map[type?.toLowerCase()] || { color: "text-slate-400", label: "?" };
  return <span className={`text-xs font-bold font-mono ${info.color} flex-shrink-0`}>{info.label}</span>;
}
