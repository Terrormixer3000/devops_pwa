"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

type SaveHandler = (
  content: string,
  commitMessage: string,
  targetMode: "current" | "new-branch",
  newBranchName: string,
  createPR: boolean,
  prTitle: string,
  filePath: string
) => Promise<void>;

/** Sheet zum Erstellen einer neuen Datei im aktuellen Branch. */
export function NewFileSheet({
  open,
  onClose,
  currentPath,
  currentBranchName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentPath: string;
  currentBranchName: string;
  onSave: SaveHandler;
}) {
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"current" | "new-branch">("current");
  const [newBranchName, setNewBranchName] = useState("");
  const [createPR, setCreatePR] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFileName("");
    setFileContent("");
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

  const fullPath = currentPath === "/" ? `/${fileName.trim()}` : `${currentPath}/${fileName.trim()}`;

  const isDisabled =
    pending ||
    !fileName.trim() ||
    !commitMessage.trim() ||
    (targetMode === "new-branch" && !newBranchName.trim()) ||
    (createPR && !prTitle.trim());

  const handleSubmit = async () => {
    setPending(true);
    setError(null);
    try {
      await onSave(
        fileContent,
        commitMessage.trim(),
        targetMode,
        newBranchName.trim(),
        createPR,
        prTitle.trim(),
        fullPath
      );
      reset();
    } catch (err) {
      setError((err as Error).message || "Fehler beim Erstellen der Datei.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Neue Datei anlegen">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Dateiname *</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="z.B. README.md"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
          />
          {fileName.trim() && <p className="text-xs text-slate-500 font-mono">{fullPath}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Inhalt</label>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            placeholder="Dateiinhalt (optional)"
            rows={6}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs font-mono resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Commit-Nachricht *</label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="z.B. Neue Datei hinzugefügt"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Ziel</label>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
            {(["current", "new-branch"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTargetMode(m)}
                className={`rounded-[0.9rem] py-2.5 text-xs font-medium transition-colors ${
                  targetMode === m ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-400"
                }`}
              >
                {m === "current" ? `Branch: ${currentBranchName}` : "Neuer Branch"}
              </button>
            ))}
          </div>
        </div>

        {targetMode === "new-branch" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Branch-Name *</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, "-"))}
                placeholder="z.B. feature/neue-datei"
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
              <span className="text-sm text-slate-300">Pull Request erstellen</span>
            </label>
            {createPR && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">PR-Titel *</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="z.B. Feature: Neue Datei"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-slate-500">Ziel-Branch: {currentBranchName}</p>
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
          {pending ? "Wird erstellt…" : "Datei erstellen"}
        </button>
      </div>
    </Modal>
  );
}
