"use client";

import { useState } from "react";
import { GitBranch, Tag, ChevronRight, GitCompare, Plus } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import type { Branch } from "@/types";

/** Branch- und Tag-Liste mit Aktionen (Auswahl, Vergleich, Neu erstellen). */
export function BranchList({
  branches,
  tags,
  loading,
  error,
  onSelect,
  onCompare,
  onRefetch,
  onCreateBranch,
}: {
  branches: Branch[];
  tags: Branch[];
  loading: boolean;
  error: unknown;
  onSelect: (b: Branch) => void;
  onCompare: (b: Branch) => void;
  onRefetch: () => void;
  onCreateBranch: (branchName: string, sourceObjectId: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"branches" | "tags">("branches");
  const items = mode === "branches" ? branches : tags;

  const [createOpen, setCreateOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [sourceMode, setSourceMode] = useState<"branch" | "commit">("branch");
  const [sourceBranchName, setSourceBranchName] = useState("");
  const [sourceCommitHash, setSourceCommitHash] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setNewBranchName("");
    setSourceMode("branch");
    setSourceBranchName("");
    setSourceCommitHash("");
    setCreateError(null);
  };

  const handleCloseModal = () => {
    setCreateOpen(false);
    resetForm();
  };

  const isSubmitDisabled =
    createPending ||
    !newBranchName.trim() ||
    (sourceMode === "branch" ? !sourceBranchName : !sourceCommitHash.trim());

  const handleCreateSubmit = async () => {
    const trimmedName = newBranchName.trim();
    if (!trimmedName) {
      setCreateError("Branch-Name darf nicht leer sein.");
      return;
    }

    let sourceObjectId = "";
    if (sourceMode === "branch") {
      const sourceBranch = branches.find((b) => b.name === sourceBranchName);
      if (!sourceBranch) {
        setCreateError("Quell-Branch nicht gefunden.");
        return;
      }
      sourceObjectId = sourceBranch.objectId;
    } else {
      const hash = sourceCommitHash.trim();
      if (!hash) {
        setCreateError("Commit-Hash darf nicht leer sein.");
        return;
      }
      sourceObjectId = hash;
    }

    setCreateError(null);
    setCreatePending(true);
    try {
      await onCreateBranch(trimmedName, sourceObjectId);
      setCreateOpen(false);
      resetForm();
      setSuccessMessage(`Branch "${trimmedName}" wurde erstellt.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setCreateError((err as Error).message || "Fehler beim Erstellen des Branches.");
    } finally {
      setCreatePending(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message="Branches konnten nicht geladen werden" error={error} onRetry={onRefetch} />;

  return (
    <div className={mode === "branches" ? "pb-24" : undefined}>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800">
        {(["branches", "tags"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === tab ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "branches" ? <GitBranch size={12} /> : <Tag size={12} />}
            {tab === "branches" ? "Branches" : "Tags"}
            <span className="ml-1 text-[10px] opacity-70">
              {tab === "branches" ? branches.length : tags.length}
            </span>
          </button>
        ))}
      </div>

      {successMessage && (
        <div className="px-4 py-2 bg-green-900/30 border-b border-green-800/40 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={mode === "branches" ? GitBranch : Tag}
          title={mode === "branches" ? "Keine Branches gefunden" : "Keine Tags gefunden"}
        />
      ) : (
        <div className="divide-y divide-slate-800/50">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-0">
              <button
                onClick={() => onSelect(item)}
                className="flex-1 flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors text-left"
              >
                {mode === "branches" ? (
                  <GitBranch size={16} className="text-blue-400 flex-shrink-0" />
                ) : (
                  <Tag size={16} className="text-purple-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">{item.objectId.substring(0, 8)}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </button>
              {mode === "branches" && (
                <button
                  onClick={() => onCompare(item)}
                  title="Vergleichen"
                  className="px-3 py-3.5 text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0"
                >
                  <GitCompare size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={handleCloseModal} title="Branch erstellen">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Branch-Name *</label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, "-"))}
              placeholder="z.B. feature/mein-feature"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-slate-500">Leerzeichen werden automatisch durch - ersetzt.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Quelle</label>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
              {(["branch", "commit"] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceMode(src)}
                  className={`rounded-[0.9rem] py-2.5 text-sm font-medium transition-colors ${
                    sourceMode === src
                      ? "bg-slate-700 text-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
                      : "text-slate-400"
                  }`}
                >
                  {src === "branch" ? "Branch" : "Commit-Hash"}
                </button>
              ))}
            </div>
          </div>

          {sourceMode === "branch" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Von Branch *</label>
              <select
                value={sourceBranchName}
                onChange={(e) => setSourceBranchName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Branch auswählen…</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Commit-Hash *</label>
              <input
                type="text"
                value={sourceCommitHash}
                onChange={(e) => setSourceCommitHash(e.target.value)}
                placeholder="z.B. a1b2c3d4e5f6…"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 py-3 bg-slate-800 font-mono border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          )}

          {createError && <p className="text-sm text-red-400">{createError}</p>}

          <button
            onClick={handleCreateSubmit}
            disabled={isSubmitDisabled}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createPending ? "Erstelle…" : "Branch erstellen"}
          </button>
        </div>
      </Modal>

      {mode === "branches" && (
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95"
          style={{ bottom: "var(--fab-bottom-offset)" }}
          aria-label="Branch erstellen"
          title="Branch erstellen"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
