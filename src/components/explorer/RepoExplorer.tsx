"use client";

import { useTranslations } from "next-intl";
import { GitBranch, Search } from "lucide-react";
import { BackActionButton } from "@/components/ui/BackButton";
import { BranchList } from "./BranchList";
import { CommitList } from "./CommitList";
import { CommitDiffView } from "./CommitDiffView";
import { FileTree } from "./FileTree";
import { FileViewer } from "./FileViewer";
import { FileHistoryView } from "./FileHistoryView";
import { BranchCompareView } from "./BranchCompareView";
import { CommitSheet } from "./CommitSheet";
import { NewFileSheet } from "./NewFileSheet";
import { SearchView } from "./SearchView";
import { getChangeKey } from "@/lib/utils/gitUtils";
import { useRepoExplorer } from "@/lib/hooks/useRepoExplorer";
import type { AppSettings, Repository } from "@/types";

/** Haupt-Explorer-Komponente für ein einzelnes Repository mit View-State-Verwaltung. */
export function RepoExplorer({ repo, settings }: { repo: Repository; settings: AppSettings }) {
  const {
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
    searchQuery, searchResults, isSearching,
    tags, branches, commits, treeItems, fileContent, fileHistoryCommits, branchDiff,
    commitChanges, commitFileDiff, selectedCommitChange,
    branchesLoading, tagsLoading, commitsLoading, treeLoading, fileLoading,
    fileHistoryLoading, branchDiffLoading, commitChangesLoading, commitFileDiffLoading,
    branchError, tagError,
    handleSelectBranch, handleSaveFile, handleCreateFile, handleOpenFileHistory,
    handleOpenCompare, handleCreateBranch, handleNavigateFolder, handleBack,
    handleOpenFile, handleOpenFileByPath, handleOpenCommit, handleSearch, handleOpenSearch,
    handleDeleteFile, handleRenameFile, refetchBranches,
  } = useRepoExplorer(repo, settings);

  const t = useTranslations("explorer");

  const canGoBack =
    view === "commits" ||
    view === "commit-diff" ||
    view === "file-content" ||
    view === "file-history" ||
    view === "compare" ||
    view === "search" ||
    pathHistory.length > 0;

  return (
    <>
      {selectedBranch && (
        <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {canGoBack && (
              <BackActionButton onClick={handleBack} iconOnly size="compact" className="shrink-0" />
            )}
            <button
              onClick={() => setView("branches")}
              className="flex items-center gap-1 text-xs text-blue-400 shrink-0"
            >
              <GitBranch size={12} />
              <span>{selectedBranch.name}</span>
            </button>
            <button
              onClick={handleOpenSearch}
              title={t("search")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors shrink-0"
            >
              <Search size={14} />
            </button>
            <div className="flex items-center gap-1 ml-auto">
              {(["files", "commits", "compare"] as const).map((entry) => {
                const isActive =
                  entry === "files"
                    ? view === "files" || view === "file-content" || view === "file-history"
                    : entry === "commits"
                    ? view === "commits" || view === "commit-diff"
                    : view === "compare";
                const label = entry === "files" ? t("tabFiles") : entry === "commits" ? t("tabCommits") : t("tabCompare");
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
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isActive ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="fixed-below-appbar mt-[3.85rem] px-4 py-2 bg-green-900/40 border-b border-green-800/50 text-sm text-green-400 z-10">
          {saveSuccess}
        </div>
      )}

      <div className={selectedBranch ? "pt-[3.85rem]" : ""}>
        {view === "branches" ? (
          <BranchList
            branches={branches}
            tags={tags}
            loading={branchesLoading || tagsLoading}
            error={branchError || tagError}
            onSelect={handleSelectBranch}
            onCompare={handleOpenCompare}
            onRefetch={refetchBranches}
            onCreateBranch={handleCreateBranch}
          />
        ) : view === "commits" ? (
          <CommitList commits={commits} loading={commitsLoading} onSelect={handleOpenCommit} />
        ) : view === "commit-diff" ? (
          <CommitDiffView
            commit={selectedCommit}
            changes={commitChanges}
            changesLoading={commitChangesLoading}
            selectedChange={selectedCommitChange}
            onSelectChange={(change) => setSelectedCommitChangeKey(getChangeKey(change))}
            diff={commitFileDiff}
            diffLoading={commitFileDiffLoading}
          />
        ) : view === "files" ? (
          <>
            <FileTree
              items={treeItems}
              loading={treeLoading}
              currentPath={currentPath}
              onFolder={handleNavigateFolder}
              onFile={handleOpenFile}
              onNewFile={() => setNewFileSheetOpen(true)}
            />
            <NewFileSheet
              open={newFileSheetOpen}
              onClose={() => setNewFileSheetOpen(false)}
              currentPath={currentPath}
              currentBranchName={selectedBranch?.name || ""}
              onSave={handleCreateFile}
            />
          </>
        ) : view === "file-history" ? (
          <FileHistoryView
            filePath={fileHistoryFile || ""}
            commits={fileHistoryCommits}
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
        ) : view === "search" ? (
          <SearchView
            searchQuery={searchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onSearch={handleSearch}
            onOpenFile={handleOpenFileByPath}
          />
        ) : (
          <>
            <FileViewer
              key={selectedFile || "file-viewer"}
              content={fileContent?.content || ""}
              imageDataUrl={fileContent?.imageDataUrl || null}
              error={fileContent?.error}
              path={selectedFile || ""}
              loading={fileLoading}
              onOpenHistory={handleOpenFileHistory}
              editMode={editMode}
              editedContent={editedContent}
              onEditStart={(content) => { setEditedContent(content); setEditMode(true); }}
              onEditCancel={() => { setEditMode(false); setEditedContent(null); }}
              onEditChange={setEditedContent}
              onRequestCommit={() => setCommitSheetOpen(true)}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
            />
            <CommitSheet
              open={commitSheetOpen}
              onClose={() => setCommitSheetOpen(false)}
              currentBranchName={selectedBranch?.name || ""}
              onSave={handleSaveFile}
              pendingContent={editedContent || ""}
            />
          </>
        )}
      </div>
    </>
  );
}
