"use client";

import { GitCommit, ChevronRight } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { RichDiffViewer } from "@/components/ui/RichDiffViewer";
import { ChangeTypeDot } from "./ChangeTypeDot";
import type { Commit } from "@/types";
import type { GitChangeEntry } from "@/lib/services/repositoriesService";

type CommitFileDiff = {
  oldContent: string;
  newContent: string;
  oldImageDataUrl?: string | null;
  newImageDataUrl?: string | null;
  error: string | null;
};

/** Diff-Ansicht für einen bestimmten Commit mit Dateiliste. */
export function CommitDiffView({
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
  diff?: CommitFileDiff;
  diffLoading: boolean;
}) {
  if (!commit) return <EmptyState icon={GitCommit} title="Kein Commit ausgewählt" />;
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
        <p className="text-sm text-slate-500 text-center py-4">Keine Dateiänderungen gefunden</p>
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
                  <ChevronRight
                    size={14}
                    className={`flex-shrink-0 ${isSelected ? "text-blue-400" : "text-slate-600"}`}
                  />
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
              emptyMessage={
                changeType === "rename" ? "Nur Umbenennung ohne Inhaltsänderung" : "Keine zeilenbasierten Unterschiede"
              }
            />
          )}
        </>
      )}
    </div>
  );
}
