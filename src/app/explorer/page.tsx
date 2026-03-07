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
import { repositoriesService } from "@/lib/services/repositoriesService";
import { CodeRepoSelector } from "@/components/layout/selectors/CodeRepoSelector";
import { AppSettings, Branch, Repository, TreeEntry } from "@/types";
import {
  FolderGit2,
  Folder,
  FileText,
  ChevronRight,
  GitBranch,
  ChevronLeft,
  GitCommit,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type ActiveView = "branches" | "commits" | "files" | "file-content";

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
    queryFn: () =>
      client && selectedBranch && selectedFile
        ? repositoriesService.getFileContent(client, settings.project, repo.id, selectedFile, selectedBranch.name)
        : Promise.resolve(""),
    enabled: !!client && !!selectedBranch && view === "file-content" && !!selectedFile,
  });

  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setCurrentPath("/");
    setPathHistory([]);
    setSelectedFile(null);
    setView("files");
  };

  const handleNavigateFolder = (entry: TreeEntry) => {
    setPathHistory((history) => [...history, currentPath]);
    setCurrentPath(entry.path);
  };

  const handleBack = () => {
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

  return (
    <>
      {selectedBranch && (
        <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {(view === "commits" || view === "file-content" || pathHistory.length > 0) && (
              <button onClick={handleBack} className="p-1.5 hover:bg-slate-800 rounded-lg flex-shrink-0">
                <ChevronLeft size={16} className="text-slate-400" />
              </button>
            )}
            <button onClick={() => setView("branches")} className="flex items-center gap-1 text-xs text-blue-400 flex-shrink-0">
              <GitBranch size={12} />
              <span>{selectedBranch.name}</span>
            </button>
            <div className="flex items-center gap-1 ml-auto">
              {["files", "commits"].map((entry) => (
                <button
                  key={entry}
                  onClick={() => setView(entry as ActiveView)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${view === entry ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {entry === "files" ? "Dateien" : "Commits"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={selectedBranch ? "pt-[3.85rem]" : ""}>
        {view === "branches" ? (
          <BranchList branches={branches || []} loading={branchesLoading} error={branchError} onSelect={handleSelectBranch} onRefetch={refetchBranches} />
        ) : view === "commits" ? (
          <CommitList commits={commits || []} loading={commitsLoading} />
        ) : view === "files" ? (
          <FileTree items={treeItems || []} loading={treeLoading} currentPath={currentPath} onFolder={handleNavigateFolder} onFile={handleOpenFile} />
        ) : (
          <FileViewer content={fileContent || ""} path={selectedFile || ""} loading={fileLoading} />
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
function CommitList({ commits, loading }: { commits: ReturnType<typeof repositoriesService.getCommits> extends Promise<infer T> ? T : never; loading: boolean }) {
  if (loading) return <PageLoader />;
  if (!commits || commits.length === 0) return <EmptyState icon={GitCommit} title="Keine Commits gefunden" />;

  return (
    <div className="divide-y divide-slate-800/50">
      {commits.map((commit) => (
        <div key={commit.commitId} className="px-4 py-3">
          <p className="text-sm text-slate-100 line-clamp-2">{commit.comment}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="font-mono text-blue-400">{commit.commitId.substring(0, 8)}</span>
            <span>{commit.author.name}</span>
            <span className="ml-auto">
              {formatDistanceToNow(new Date(commit.author.date), { addSuffix: true, locale: de })}
            </span>
          </div>
        </div>
      ))}
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
function FileViewer({ content, path, loading }: { content: string; path: string; loading: boolean }) {
  if (loading) return <PageLoader />;

  const lines = content.split("\n");

  return (
    <div>
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
        <p className="text-xs font-mono text-slate-400">{path}</p>
      </div>
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
    </div>
  );
}
