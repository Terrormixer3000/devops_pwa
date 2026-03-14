"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

type SaveHandler = (
  content: string,
  commitMessage: string,
  targetMode: "current" | "new-branch",
  newBranchName: string,
  createPR: boolean,
  prTitle: string
) => Promise<void>;

/** Sheet zum Speichern von Dateiänderungen als Commit. */
export function CommitSheet({
  open,
  onClose,
  currentBranchName,
  onSave,
  pendingContent,
}: {
  open: boolean;
  onClose: () => void;
  currentBranchName: string;
  onSave: SaveHandler;
  pendingContent: string;
}) {
  const ts = useTranslations("explorer.commitSheet");
  const [commitMessage, setCommitMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"current" | "new-branch">("current");
  const [newBranchName, setNewBranchName] = useState("");
  const [createPR, setCreatePR] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCommitMessage("");
    setTargetMode("current");
    setNewBranchName("");
    setCreatePR(false);
    setPrTitle("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isDisabled =
    pending ||
    !commitMessage.trim() ||
    (targetMode === "new-branch" && !newBranchName.trim()) ||
    (createPR && !prTitle.trim());

  const handleSubmit = async () => {
    setPending(true);
    setError(null);
    try {
      await onSave(pendingContent, commitMessage.trim(), targetMode, newBranchName.trim(), createPR, prTitle.trim());
      reset();
    } catch (err) {
      setError((err as Error).message || ts("saveError"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={ts("title")}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">{ts("commitMessage")}</label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder={ts("commitMessagePlaceholder")}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">{ts("target")}</label>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
            {(["current", "new-branch"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTargetMode(m)}
                className={`rounded-[0.9rem] py-2.5 text-xs font-medium transition-colors ${
                  targetMode === m ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-400"
                }`}
              >
                {m === "current" ? ts("currentBranch", { branch: currentBranchName }) : ts("newBranch")}
              </button>
            ))}
          </div>
        </div>

        {targetMode === "new-branch" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">{ts("branchName")}</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, "-"))}
                placeholder={ts("branchNamePlaceholder")}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createPR}
                onChange={(e) => setCreatePR(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500"
              />
              <span className="text-sm text-slate-300">{ts("createPR")}</span>
            </label>
            {createPR && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{ts("prTitle")}</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder={ts("prTitlePlaceholder")}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-slate-500">{ts("targetBranch", { branch: currentBranchName })}</p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          {pending ? ts("saving") : ts("save")}
        </button>
      </div>
    </Modal>
  );
}
