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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type ActiveView = "branches" | "commits" | "commit-diff" | "files" | "file-content";

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
  const { client } = useAzureClient();

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
    setView("files");
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
            {(view === "commits" || view === "commit-diff" || view === "file-content" || pathHistory.length > 0) && (
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
              {["files", "commits"].map((entry) => {
                const isActive = entry === "files"
                  ? view === "files" || view === "file-content"
                  : view === "commits" || view === "commit-diff";
                return (
                  <button
                    key={entry}
                    onClick={() => setView(entry as ActiveView)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {entry === "files" ? "Dateien" : "Commits"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className={selectedBranch ? "pt-[3.85rem]" : ""}>
        {view === "branches" ? (
          <BranchList branches={branches || []} loading={branchesLoading} error={branchError} onSelect={handleSelectBranch} onRefetch={refetchBranches} />
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
        ) : (
          <FileViewer
            key={selectedFile || "file-viewer"}
            content={fileContent?.content || ""}
            imageDataUrl={fileContent?.imageDataUrl || null}
            error={fileContent?.error}
            path={selectedFile || ""}
            loading={fileLoading}
          />
        )}
      </div>
    </>
  );
}

// Branch-Liste
function BranchList({ branches, loading, error, onSelect, onRefetch }: {
  branches: Branch[];
  loading: boolean;
  error: unknown;
  onSelect: (b: Branch) => void;
  onRefetch: () => void;
}) {
  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message="Branches konnten nicht geladen werden" onRetry={onRefetch} />;
  if (branches.length === 0) return <EmptyState icon={GitBranch} title="Keine Branches gefunden" />;

  return (
    <div className="divide-y divide-slate-800/50">
      {branches.map((branch) => (
        <button
          key={branch.name}
          onClick={() => onSelect(branch)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors text-left"
        >
          <GitBranch size={16} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{branch.name}</p>
            <p className="text-xs text-slate-500 truncate">{branch.objectId.substring(0, 8)}</p>
          </div>
          <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
        </button>
      ))}
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

// Dateiinhalt Anzeige
function FileViewer({
  content,
  imageDataUrl,
  error,
  path,
  loading,
}: {
  content: string;
  imageDataUrl?: string | null;
  error?: string | null;
  path: string;
  loading: boolean;
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
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
        <p className="text-xs font-mono text-slate-400">{path}</p>
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
