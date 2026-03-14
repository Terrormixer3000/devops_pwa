"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface PipelineYamlCommitRequest {
  targetKind: "existing" | "new";
  branchName: string;
  commitMessage: string;
  createPR: boolean;
  prTitle: string;
}

interface PipelineYamlCommitModalProps {
  open: boolean;
  defaultBranchName: string;
  existingBranches: string[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (request: PipelineYamlCommitRequest) => void;
}

/** Commit-Dialog fuer den YAML-Editor mit Branch-Auswahl und optionalem PR-Flow. */
export function PipelineYamlCommitModal({
  open,
  defaultBranchName,
  existingBranches,
  pending,
  error,
  onClose,
  onSubmit,
}: PipelineYamlCommitModalProps) {
  const t = useTranslations("yamlCommit");
  const [commitMessage, setCommitMessage] = useState("");
  const [targetKind, setTargetKind] = useState<"existing" | "new">("existing");
  const [existingBranchName, setExistingBranchName] = useState(defaultBranchName);
  const [newBranchName, setNewBranchName] = useState("");
  const [createPR, setCreatePR] = useState(false);
  const [prTitle, setPrTitle] = useState("");

  const selectedBranchName = targetKind === "existing" ? existingBranchName : newBranchName.trim();
  const canCreatePR = selectedBranchName.length > 0 && selectedBranchName !== defaultBranchName;
  const effectiveCreatePR = canCreatePR && createPR;
  const isDisabled =
    pending ||
    !commitMessage.trim() ||
    !selectedBranchName ||
    (effectiveCreatePR && !prTitle.trim());

  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">{t("commitMessage")}</label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="z.B. Add pipeline YAML"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">{t("target")}</label>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
            {(["existing", "new"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setTargetKind(kind)}
                className={`rounded-[0.9rem] py-2.5 text-xs font-medium transition-colors ${
                  targetKind === kind ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-400"
                }`}
              >
                {kind === "existing" ? t("existingBranch") : t("newBranch")}
              </button>
            ))}
          </div>
        </div>

        {targetKind === "existing" ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Branch</label>
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              <div className="flex items-center gap-1.5 border-b border-slate-700/70 px-3 py-2 text-[11px] text-slate-500">
                <GitBranch size={13} />
                <span>{t("chooseExistingBranch")}</span>
              </div>
              <div className="max-h-52 divide-y divide-slate-700/50 overflow-y-auto">
                {existingBranches.map((branchName) => (
                  <button
                    key={branchName}
                    type="button"
                    onClick={() => setExistingBranchName(branchName)}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors ${
                      existingBranchName === branchName
                        ? "bg-blue-600/20 text-blue-300"
                        : "text-slate-300 hover:bg-slate-700/50"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono">{branchName}</span>
                    {branchName === defaultBranchName && (
                      <span className="rounded-full border border-slate-600 bg-slate-900/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                        {t("default")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">{t("branchName")}</label>
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
        )}

        {canCreatePR && (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={createPR}
                onChange={(e) => setCreatePR(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500"
              />
              <span className="text-sm text-slate-300">{t("createPR")}</span>
            </label>

            {effectiveCreatePR && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{t("prTitle")}</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="z.B. Add pipeline YAML"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500">{t("targetBranch", { branch: defaultBranchName })}</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            className="flex-1"
            loading={pending}
            disabled={isDisabled}
            onClick={() =>
              onSubmit({
                targetKind,
                branchName: selectedBranchName,
                commitMessage: commitMessage.trim(),
                createPR: effectiveCreatePR,
                prTitle: prTitle.trim(),
              })
            }
          >
            <Plus size={16} />
            {t("commit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
