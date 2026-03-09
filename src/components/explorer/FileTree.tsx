"use client";

import { Folder, FileText, ChevronRight, FilePlus } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TreeEntry } from "@/types";

/** Dateibaum-Navigation mit Ordner- und Datei-Einträgen. */
export function FileTree({
  items,
  loading,
  currentPath,
  onFolder,
  onFile,
  onNewFile,
}: {
  items: TreeEntry[];
  loading: boolean;
  currentPath: string;
  onFolder: (e: TreeEntry) => void;
  onFile: (e: TreeEntry) => void;
  onNewFile?: () => void;
}) {
  if (loading) return <PageLoader />;

  const sorted = [...items].sort((a, b) => {
    if (a.gitObjectType === b.gitObjectType) return a.path.localeCompare(b.path);
    return a.gitObjectType === "tree" ? -1 : 1;
  });

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <span className="text-xs text-slate-500 font-mono truncate">{currentPath !== "/" ? currentPath : "/"}</span>
        {onNewFile && (
          <button
            onClick={onNewFile}
            title="Neue Datei"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0"
          >
            <FilePlus size={14} />
          </button>
        )}
      </div>
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
                onClick={() => (isFolder ? onFolder(entry) : onFile(entry))}
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
