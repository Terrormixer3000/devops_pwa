"use client";

import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Commit } from "@/types";
import { timeAgo } from "@/lib/utils/timeAgo";

/** Historie einer Datei: Listet alle Commits, die die Datei beeinflusst haben. */
export function FileHistoryView({
  filePath,
  commits,
  loading,
  onSelectCommit,
}: {
  filePath: string;
  commits: Commit[];
  loading: boolean;
  onSelectCommit: (c: Commit) => void;
}) {
  const t = useTranslations("explorer");
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
        <EmptyState icon={History} title={t("noCommitsFound")} />
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
                <span className="ml-auto">{timeAgo(commit.author.date)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
