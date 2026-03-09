"use client";

import { ChevronLeft, ChevronRight, GitCommit } from "lucide-react";
import { RichDiffViewer } from "@/components/ui/RichDiffViewer";
import { ChangeTypeDot } from "./ChangeTypeDot";
import { timeAgo } from "@/lib/utils/timeAgo";
import { getChangeKey } from "@/lib/utils/gitUtils";
import type { PRIteration } from "@/types";
import type { GitChangeEntry } from "@/lib/services/repositoriesService";

type FileDiffData = {
  oldContent: string;
  newContent: string;
  oldImageDataUrl?: string | null;
  newImageDataUrl?: string | null;
  error: string | null;
};

type IterationChanges = { changeEntries: GitChangeEntry[] };

export function PRTabCommits({
  iterations,
  selectedIterationId,
  onSelectIteration,
  commitChanges,
  selectedCommitChange,
  onSelectCommitChange,
  commitFileDiff,
  commitFileDiffLoading,
  commitOldCommitId,
  commitNewCommitId,
  commitOldPath,
  commitNewPath,
  commitSelectedChangeType,
}: {
  iterations: PRIteration[] | undefined;
  selectedIterationId: number | null;
  onSelectIteration: (id: number | null) => void;
  commitChanges: IterationChanges | undefined;
  selectedCommitChange: GitChangeEntry | null;
  onSelectCommitChange: (key: string) => void;
  commitFileDiff: FileDiffData | undefined;
  commitFileDiffLoading: boolean;
  commitOldCommitId: string;
  commitNewCommitId: string;
  commitOldPath: string;
  commitNewPath: string;
  commitSelectedChangeType: string | undefined;
}) {
  if (selectedIterationId) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => { onSelectIteration(null); onSelectCommitChange(""); }}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft size={16} /> Alle Commits
        </button>

        {commitChanges?.changeEntries && commitChanges.changeEntries.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-700/60">
            {commitChanges.changeEntries.map((entry, i) => {
              const entryKey = getChangeKey(entry);
              const isSelected = selectedCommitChange ? getChangeKey(selectedCommitChange) === entryKey : false;
              return (
                <button
                  key={`${entry.item.path}-${entry.changeType}-${i}`}
                  onClick={() => onSelectCommitChange(entryKey)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/50 text-left transition-colors last:border-b-0 ${
                    isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                  }`}
                >
                  <ChangeTypeDot type={entry.changeType} />
                  <span className="text-xs font-mono text-slate-300 truncate flex-1">{entry.item.path}</span>
                  <ChevronRight
                    size={14}
                    className={`flex-shrink-0 ${isSelected ? "text-blue-400" : "text-slate-600"}`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">Keine geänderten Dateien</p>
        )}

        {selectedCommitChange && (
          <RichDiffViewer
            key={`commit:${selectedIterationId}:${selectedCommitChange.item.path}:${selectedCommitChange.changeType}`}
            path={selectedCommitChange.item.path}
            title={selectedCommitChange.item.path}
            oldContent={commitFileDiff?.oldContent || ""}
            newContent={commitFileDiff?.newContent || ""}
            oldLabel={`${commitOldCommitId.substring(0, 8)}:${commitOldPath}`}
            newLabel={`${commitNewCommitId.substring(0, 8)}:${commitNewPath}`}
            oldImageSrc={commitFileDiff?.oldImageDataUrl || null}
            newImageSrc={commitFileDiff?.newImageDataUrl || null}
            loading={commitFileDiffLoading}
            error={commitFileDiff?.error}
            emptyMessage={
              commitSelectedChangeType === "rename"
                ? "Nur Umbenennung ohne Inhaltsänderung"
                : "Keine zeilenbasierten Unterschiede"
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {iterations?.map((iter) => (
        <button
          key={iter.id}
          onClick={() => { onSelectIteration(iter.id); onSelectCommitChange(""); }}
          className="w-full p-3 bg-slate-800/60 rounded-xl text-left hover:bg-slate-800 transition-colors active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <GitCommit size={14} className="text-blue-400 flex-shrink-0" />
            <span className="font-mono truncate">{iter.sourceRefCommit?.commitId?.substring(0, 8)}</span>
            <span className="ml-auto flex-shrink-0">{timeAgo(iter.createdDate)}</span>
            <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
          </div>
          {iter.description && <p className="text-sm text-slate-300 mt-1">{iter.description}</p>}
        </button>
      ))}
    </div>
  );
}
