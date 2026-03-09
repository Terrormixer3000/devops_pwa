"use client";

import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Minimal-Typ für ein Team-Mitglied im Reviewer-Picker. */
type Member = { id: string; displayName: string; uniqueName?: string };

/** Modal zum Hinzufügen eines Reviewers mit Suchfeld und Required/Optional-Toggle. */
export function PRReviewerModal({
  open,
  availableMembers,
  reviewerSearch,
  reviewerError,
  pendingReviewer,
  pendingIsRequired,
  addPending,
  onChangeSearch,
  onSelectMember,
  onToggleRequired,
  onAdd,
  onClose,
}: {
  open: boolean;
  availableMembers: Member[];
  reviewerSearch: string;
  reviewerError: string | null;
  pendingReviewer: { id: string; displayName: string } | null;
  pendingIsRequired: boolean;
  addPending: boolean;
  onChangeSearch: (v: string) => void;
  onSelectMember: (m: Member | null) => void;
  onToggleRequired: () => void;
  onAdd: (reviewerId: string, isRequired: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Reviewer hinzufügen">
      <div className="space-y-3">
        {reviewerError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50">
            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{reviewerError}</p>
          </div>
        )}
        <input
          type="text"
          value={reviewerSearch}
          onChange={(e) => { onChangeSearch(e.target.value); onSelectMember(null); }}
          placeholder="Name suchen…"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500"
        />
        <div className="max-h-56 overflow-y-auto space-y-1">
          {availableMembers.map((m) => (
            <div key={m.id}>
              <button
                onClick={() => onSelectMember(pendingReviewer?.id === m.id ? null : m)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  pendingReviewer?.id === m.id ? "bg-slate-700" : "hover:bg-slate-800"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-slate-300">
                    {m.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{m.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{m.uniqueName}</p>
                </div>
              </button>
              {pendingReviewer?.id === m.id && (
                <div className="px-3 pb-2 flex items-center gap-3">
                  <button
                    onClick={onToggleRequired}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                      pendingIsRequired
                        ? "border-red-600 text-red-400 bg-red-900/20"
                        : "border-slate-600 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {pendingIsRequired ? "Pflicht" : "Optional"}
                  </button>
                  <Button
                    size="sm"
                    loading={addPending}
                    onClick={() => onAdd(m.id, pendingIsRequired)}
                  >
                    Hinzufügen
                  </Button>
                </div>
              )}
            </div>
          ))}
          {availableMembers.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-3">Keine Mitglieder gefunden</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
