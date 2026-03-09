"use client";

import { ChevronRight } from "lucide-react";
import { RichDiffViewer } from "@/components/ui/RichDiffViewer";
import { ChangeTypeDot } from "./ChangeTypeDot";
import type { GitChangeEntry } from "@/lib/services/repositoriesService";
import { getChangeKey } from "@/lib/utils/gitUtils";

type FileDiffData = {
  oldContent: string;
  newContent: string;
  oldImageDataUrl?: string | null;
  newImageDataUrl?: string | null;
  error: string | null;
};

export function PRTabFiles({
  changeEntries,
  selectedChange,
  onSelectChange,
  selectedFileDiff,
  selectedFileDiffLoading,
  sourceBranch,
  targetBranch,
}: {
  changeEntries: GitChangeEntry[];
  selectedChange: GitChangeEntry | null;
  onSelectChange: (key: string) => void;
  selectedFileDiff: FileDiffData | undefined;
  selectedFileDiffLoading: boolean;
  sourceBranch: string;
  targetBranch: string;
}) {
  const selectedChangeType = selectedChange?.changeType?.toLowerCase();
  const oldPath = selectedChange?.originalPath || selectedChange?.item.path || "";
  const newPath = selectedChange?.item.path || "";

  if (changeEntries.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-4">Keine geänderten Dateien</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-700/60">
        {changeEntries.map((entry, i) => {
          const entryKey = getChangeKey(entry);
          const isSelected = selectedChange ? getChangeKey(selectedChange) === entryKey : false;
          return (
            <button
              key={`${entry.item.path}-${entry.changeType}-${i}`}
              onClick={() => onSelectChange(entryKey)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/50 text-left transition-colors ${
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

      {selectedChange && (
        <RichDiffViewer
          key={`${selectedChange.item.path}:${selectedChange.changeType}:${selectedChange.originalPath || ""}`}
          path={selectedChange.item.path}
          title={selectedChange.item.path}
          oldContent={selectedFileDiff?.oldContent || ""}
          newContent={selectedFileDiff?.newContent || ""}
          oldLabel={`${targetBranch}:${oldPath}`}
          newLabel={`${sourceBranch}:${newPath}`}
          oldImageSrc={selectedFileDiff?.oldImageDataUrl || null}
          newImageSrc={selectedFileDiff?.newImageDataUrl || null}
          loading={selectedFileDiffLoading}
          error={selectedFileDiff?.error}
          emptyMessage={
            selectedChangeType === "rename"
              ? "Nur Umbenennung ohne Inhaltsänderung"
              : "Keine zeilenbasierten Unterschiede"
          }
        />
      )}
    </div>
  );
}
