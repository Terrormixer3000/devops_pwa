"use client";

import { useTranslations } from "next-intl";
import { ThumbsUp, Zap, Loader } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

/** Modal zum Abgeben eines Reviewer-Votes (Approve / Ablehnen / Zurücksetzen). */
export function PRVoteModal({
  open,
  votePending,
  autoCompleteOnApprove,
  onToggleAutoComplete,
  onClose,
  onVote,
}: {
  open: boolean;
  votePending: boolean;
  autoCompleteOnApprove: boolean;
  onToggleAutoComplete: () => void;
  onClose: () => void;
  onVote: (vote: number) => void;
}) {
  const t = useTranslations("prVote");
  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <div className="space-y-3">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-800/50 bg-green-900/20 py-2.5 text-sm font-medium text-green-400 hover:bg-green-900/35 transition-colors disabled:opacity-40"
          disabled={votePending}
          onClick={() => onVote(10)}
        >
          {votePending ? <Loader size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
          {t("approve")}
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-800/50 bg-amber-900/20 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-900/35 transition-colors disabled:opacity-40"
          disabled={votePending}
          onClick={() => onVote(5)}
        >
          {votePending ? <Loader size={14} className="animate-spin" /> : null}
          {t("approveWithSuggestions")}
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/70 transition-colors disabled:opacity-40"
          disabled={votePending}
          onClick={() => onVote(-5)}
        >
          {votePending ? <Loader size={14} className="animate-spin" /> : null}
          {t("waitForAuthor")}
        </button>

        <div className="flex items-center justify-between py-2.5 px-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            <div>
              <p className="text-sm text-slate-200">{t("autoComplete")}</p>
              <p className="text-xs text-slate-500">{t("autoCompleteDesc")}</p>
            </div>
          </div>
          <button
            onClick={onToggleAutoComplete}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
              autoCompleteOnApprove ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                autoCompleteOnApprove ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

      </div>
    </Modal>
  );
}
