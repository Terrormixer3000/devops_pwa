"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { stripRefPrefix } from "@/lib/utils/gitUtils";
import type { Pipeline } from "@/types";
import { GitBranch, Info, Play, Plus, X } from "lucide-react";

const QUICK_BRANCHES = ["main", "develop", "release/2026.03", "hotfix/urgent-fix"];

interface PipelineParam { key: string; value: string; }

/** Normalisiert eine Branch-Eingabe: entfernt `refs/heads/`-Präfix und überflüssige Leerzeichen. */
function normalizeBranch(branch: string): string {
  return stripRefPrefix(branch).trim();
}

/** Validiert einen Branch-Namen und gibt eine Fehlermeldung oder `null` zurück. */
function getBranchError(branch: string): string | null {
  if (!branch) return "Bitte einen Branch-Namen eingeben.";
  if (branch.startsWith("/") || branch.endsWith("/")) return "Branch darf nicht mit / starten oder enden.";
  if (branch.endsWith(".") || branch.endsWith(".lock")) return "Branch endet mit einem ungültigen Suffix.";
  if (branch.includes(" ") || branch.includes("..") || branch.includes("//")) return "Branch enthält ungültige Zeichen.";
  if (branch.includes("@{") || branch.includes("\\")) return "Branch-Format ist ungültig.";
  return null;
}

interface StartPipelineModalProps {
  open: boolean;
  pipeline: Pipeline | null;
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onStart: (branchRef: string, params: Record<string, string>) => void;
}

/** Modal zum Starten einer Pipeline mit Branch-Auswahl und optionalen Parametern. */
export function StartPipelineModal({ open, pipeline, isPending, error, onClose, onStart }: StartPipelineModalProps) {
  const [branch, setBranch] = useState("main");
  const [params, setParams] = useState<PipelineParam[]>([]);

  const normalized = normalizeBranch(branch);
  const branchError = getBranchError(normalized);
  const branchRef = normalized ? `refs/heads/${normalized}` : "";
  const canStart = !!pipeline && !branchError && !isPending;

  const handleClose = () => {
    if (isPending) return;
    setBranch("main");
    setParams([]);
    onClose();
  };

  const handleStart = () => {
    if (!canStart) return;
    const paramMap: Record<string, string> = {};
    for (const p of params) {
      if (p.key.trim()) paramMap[p.key.trim()] = p.value;
    }
    onStart(branchRef, Object.keys(paramMap).length > 0 ? paramMap : {});
    setBranch("main");
    setParams([]);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Pipeline starten">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/45 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Definition</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-100">{pipeline?.name}</p>
          {pipeline?.folder && pipeline.folder !== "\\" && (
            <p className="mt-1 text-xs text-slate-500">{pipeline.folder}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Branch</label>
          <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/60">
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2 text-[11px] text-slate-500">
              <GitBranch size={13} />
              <span className="font-mono">refs/heads/</span>
            </div>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canStart) { e.preventDefault(); handleStart(); } }}
              className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              placeholder="main"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_BRANCHES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBranch(b)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  normalized === b
                    ? "border-blue-400/70 bg-blue-600/20 text-blue-300"
                    : "border-slate-700 bg-slate-800/70 text-slate-400 hover:text-slate-200"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          {branchError ? (
            <p className="text-xs text-red-400">{branchError}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Ziel-Ref: <span className="font-mono text-slate-300">{branchRef}</span>
            </p>
          )}
        </div>

        {/* Pipeline-Parameter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Parameter</label>
            <button
              type="button"
              onClick={() => setParams((p) => [...p, { key: "", value: "" }])}
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus size={12} />
              Hinzufügen
            </button>
          </div>
          {params.length === 0 ? (
            <p className="text-xs text-slate-600">Keine Parameter gesetzt</p>
          ) : (
            <div className="space-y-2">
              {params.map((param, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => setParams((prev) => prev.map((p, j) => j === i ? { ...p, key: e.target.value } : p))}
                    placeholder="Name"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => setParams((prev) => prev.map((p, j) => j === i ? { ...p, value: e.target.value } : p))}
                    placeholder="Wert"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setParams((prev) => prev.filter((_, j) => j !== i))}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2.5">
          <p className="flex items-start gap-2 text-xs text-blue-200">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-300" />
            Der Run startet sofort mit dem Branch-Stand und den angegebenen Parametern.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button className="flex-1" loading={isPending} disabled={!canStart} onClick={handleStart}>
            <Play size={16} />
            Jetzt starten
          </Button>
        </div>
      </div>
    </Modal>
  );
}
