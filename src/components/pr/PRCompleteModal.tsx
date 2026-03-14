"use client";

import { useTranslations } from "next-intl";
import { GitMerge, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Merge-Strategie-Optionen beim Abschließen eines Pull Requests. */
type MergeStrategy = "noFastForward" | "squash" | "rebase" | "rebaseMerge";

/** Modal zum Abschließen (Mergen) eines Pull Requests mit Merge-Strategie-Auswahl. */
export function PRCompleteModal({
  open,
  sourceBranch,
  mergeStrategy,
  deleteSourceBranch,
  completePending,
  completeError,
  onChangeMergeStrategy,
  onToggleDeleteBranch,
  onClose,
  onComplete,
}: {
  open: boolean;
  sourceBranch: string;
  mergeStrategy: MergeStrategy;
  deleteSourceBranch: boolean;
  completePending: boolean;
  completeError: string | null;
  onChangeMergeStrategy: (s: MergeStrategy) => void;
  onToggleDeleteBranch: () => void;
  onClose: () => void;
  onComplete: () => void;
}) {
  const t = useTranslations("prComplete");
  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("mergeStrategy")}</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "noFastForward" as const, label: t("mergeCommit"), desc: "Merge-Commit" },
              { key: "squash" as const, label: t("squash"), desc: "Ein Commit" },
              { key: "rebase" as const, label: t("rebase"), desc: "Linear" },
              { key: "rebaseMerge" as const, label: t("rebaseFF"), desc: "Rebase mit Merge" },
            ]).map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => onChangeMergeStrategy(key)}
                className={`px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  mergeStrategy === key
                    ? "border-blue-500 bg-blue-500/15 text-blue-300"
                    : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600"
                }`}
              >
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-slate-800">
          <div>
            <p className="text-sm text-slate-300">{t("deleteSourceBranch")}</p>
            <p className="text-xs text-slate-500">{sourceBranch}</p>
          </div>
          <button
            onClick={onToggleDeleteBranch}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              deleteSourceBranch ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                deleteSourceBranch ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {completeError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{completeError}</p>
          </div>
        )}

        <Button fullWidth onClick={onComplete} loading={completePending}>
          <GitMerge size={16} />
          {t("mergeNow")}
        </Button>
        <Button fullWidth variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </div>
    </Modal>
  );
}
