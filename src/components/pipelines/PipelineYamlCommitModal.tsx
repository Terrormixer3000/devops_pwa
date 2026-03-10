"use client";

import { useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface PipelineYamlCommitRequest {
  commitMessage: string;
  targetMode: "current" | "new-branch";
  newBranchName: string;
  createPR: boolean;
  prTitle: string;
}

interface PipelineYamlCommitModalProps {
  open: boolean;
  currentBranchName: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (request: PipelineYamlCommitRequest) => void;
}

/** Commit-Dialog fuer den YAML-Editor mit Branch-Auswahl und optionalem PR-Flow. */
export function PipelineYamlCommitModal({
  open,
  currentBranchName,
  pending,
  error,
  onClose,
  onSubmit,
}: PipelineYamlCommitModalProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"current" | "new-branch">("current");
  const [newBranchName, setNewBranchName] = useState("");
  const [createPR, setCreatePR] = useState(false);
  const [prTitle, setPrTitle] = useState("");

  const isDisabled =
    pending ||
    !commitMessage.trim() ||
    (targetMode === "new-branch" && !newBranchName.trim()) ||
    (createPR && !prTitle.trim());

  return (
    <Modal open={open} onClose={onClose} title="YAML committen">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Commit-Nachricht *</label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="z.B. Add pipeline YAML"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Ziel</label>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
            {(["current", "new-branch"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTargetMode(mode)}
                className={`rounded-[0.9rem] py-2.5 text-xs font-medium transition-colors ${
                  targetMode === mode ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-400"
                }`}
              >
                {mode === "current" ? `Branch: ${currentBranchName}` : "Neuer Branch"}
              </button>
            ))}
          </div>
        </div>

        {targetMode === "new-branch" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Branch-Name *</label>
              <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                <div className="flex items-center gap-1.5 border-b border-slate-700/70 px-3 py-2 text-[11px] text-slate-500">
                  <GitBranch size={13} />
                  <span className="font-mono">refs/heads/</span>
                </div>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, "-"))}
                  placeholder="feature/pipeline-yaml"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={createPR}
                onChange={(e) => setCreatePR(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500"
              />
              <span className="text-sm text-slate-300">Pull Request erstellen</span>
            </label>

            {createPR && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">PR-Titel *</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="z.B. Add pipeline YAML"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">Ziel-Branch: {currentBranchName}</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button
            className="flex-1"
            loading={pending}
            disabled={isDisabled}
            onClick={() =>
              onSubmit({
                commitMessage: commitMessage.trim(),
                targetMode,
                newBranchName: newBranchName.trim(),
                createPR,
                prTitle: prTitle.trim(),
              })
            }
          >
            <Plus size={16} />
            Committen
          </Button>
        </div>
      </div>
    </Modal>
  );
}
