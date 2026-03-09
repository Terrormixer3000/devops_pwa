"use client";

import { GitBranch, GitCompare } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChangeTypeDot } from "./ChangeTypeDot";
import type { Commit } from "@/types";

type BranchDiff = {
  commits: Commit[];
  changes: Array<{ changeType: string; item: { path: string } }>;
  commonCommit: string;
};

/** Branch-Vergleichs-Ansicht: Zeigt den Diff zwischen zwei Branches. */
export function BranchCompareView({
  baseBranch,
  targetBranch,
  diff,
  loading,
}: {
  baseBranch: string;
  targetBranch: string;
  diff?: BranchDiff | null;
  loading: boolean;
}) {
  if (loading) return <PageLoader />;
  if (!diff)
    return (
      <EmptyState
        icon={GitCompare}
        title="Branch auswählen"
        description="Tippe auf das Vergleich-Symbol neben einem Branch"
      />
    );

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
        {diff.commits.length} Commit{diff.commits.length !== 1 ? "s" : ""} voraus &middot;{" "}
        {diff.changes.length} Datei{diff.changes.length !== 1 ? "en" : ""} geändert
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
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {commit.commitId.substring(0, 8)} &middot; {commit.author.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
