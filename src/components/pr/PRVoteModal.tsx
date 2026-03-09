"use client";

import { ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

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
  return (
    <Modal open={open} onClose={onClose} title="Pull Request bewerten">
      <div className="space-y-3">
        <Button fullWidth onClick={() => onVote(10)} loading={votePending}>
          <ThumbsUp size={16} /> Approven
        </Button>
        <Button fullWidth variant="secondary" onClick={() => onVote(5)} loading={votePending}>
          Approven mit Vorbehalten
        </Button>
        <Button fullWidth variant="ghost" onClick={() => onVote(-5)} loading={votePending}>
          Warten auf Autor
        </Button>

        <div className="flex items-center justify-between py-2.5 px-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            <div>
              <p className="text-sm text-slate-200">Auto-Complete</p>
              <p className="text-xs text-slate-500">Automatisch mergen wenn alle Policies bestanden</p>
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

        <Button fullWidth variant="danger" onClick={() => onVote(-10)} loading={votePending}>
          <ThumbsDown size={16} /> Ablehnen
        </Button>
      </div>
    </Modal>
  );
}
