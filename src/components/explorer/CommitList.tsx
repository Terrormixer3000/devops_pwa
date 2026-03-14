"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, GitCommit } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Commit } from "@/types";
import { timeAgo } from "@/lib/utils/timeAgo";

/** Liste der Commits mit Klick-Aktion zum Öffnen des Commit-Diffs. */
export function CommitList({
  commits,
  loading,
  onSelect,
}: {
  commits: Commit[];
  loading: boolean;
  onSelect: (commit: Commit) => void;
}) {
  const t = useTranslations("explorer");
  if (loading) return <PageLoader />;
  if (!commits || commits.length === 0) return <EmptyState icon={GitCommit} title={t("noCommitsFound")} />;

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
            <span className="ml-auto">{timeAgo(commit.author.date)}</span>
            <ChevronRight size={14} className="text-slate-600" />
          </div>
        </button>
      ))}
    </div>
  );
}
