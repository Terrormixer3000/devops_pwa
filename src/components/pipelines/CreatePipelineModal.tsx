"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { PipelineCreationDraft, PipelineYamlEntryMode } from "@/lib/stores/pipelineCreationStore";

interface Repository {
  id: string;
  name: string;
  defaultBranch?: string;
}

export interface CreatePipelineData {
  name: string;
  folder: string;
  yamlPath: string;
  repositoryId: string;
  repositoryName: string;
}

/** Gibt direkte Kinder eines Ordner-Pfads zurück. */
function getFolderChildren(folders: string[], parentPath: string): string[] {
  const isRoot = parentPath === "\\";
  return folders.filter((folder) => {
    if (folder === "\\" || folder === parentPath) return false;
    if (isRoot) return !folder.slice(1).includes("\\");
    return folder.startsWith(parentPath + "\\") && !folder.slice(parentPath.length + 1).includes("\\");
  });
}

/** Gibt den lesbaren Anzeigenamen für einen Ordner-Pfad zurück (letztes Segment oder "Stammordner"). */
function folderDisplayName(path: string): string {
  if (path === "\\") return "Stammordner";
  return path.split("\\").filter(Boolean).pop() ?? path;
}

/** Erzeugt einen Kindpfad unterhalb des aktuellen Ordners. */
function buildChildFolderPath(parentPath: string, childName: string): string {
  return parentPath === "\\" ? `\\${childName}` : `${parentPath}\\${childName}`;
}

/** Normalisiert den YAML-Pfad auf einen Root-basierten Repository-Pfad. */
function normalizeYamlPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/azure-pipelines.yml";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** Liefert alle Zwischenordner fuer einen Pfad zur Rekonstruktion im Picker. */
function expandFolderChain(path: string): string[] {
  if (!path || path === "\\") return ["\\"];
  const segments = path.split("\\").filter(Boolean);
  const result = ["\\"];
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}\\${segment}` : `\\${segment}`;
    result.push(current);
  }
  return result;
}

/** Liefert die History-Eintraege fuer den Picker bis zum aktuellen Pfad. */
function buildFolderHistory(path: string): string[] {
  const chain = expandFolderChain(path);
  return chain.slice(0, -1);
}

/** Validiert den Namen eines neuen Unterordners. */
function getNewFolderError(name: string): string | null {
  if (!name.trim()) return "Bitte einen Ordnernamen eingeben.";
  if (name === "." || name === "..") return "Dieser Ordnername ist nicht erlaubt.";
  if (/[\\/:*?"<>|]/.test(name)) return "Der Ordnername enthaelt ungueltige Zeichen.";
  return null;
}

interface CreatePipelineModalProps {
  open: boolean;
  isPending: boolean;
  error: string | null;
  repositories: Repository[] | undefined;
  pipelineFolders: string[];
  initialDraft?: PipelineCreationDraft | null;
  onClose: () => void;
  onSubmit: (data: CreatePipelineData) => void;
  onStartEditor: (draft: PipelineCreationDraft) => void;
}

/** Modal fuer YAML-Pipelines mit Direkt-Create oder Editor-Flow. */
export function CreatePipelineModal({
  open,
  isPending,
  error,
  repositories,
  pipelineFolders,
  initialDraft = null,
  onClose,
  onSubmit,
  onStartEditor,
}: CreatePipelineModalProps) {
  const initialFolder = initialDraft?.folder || "\\";
  const initialYamlPath = normalizeYamlPath(initialDraft?.yamlPath || "/azure-pipelines.yml");
  const initialMissingFolderChain = expandFolderChain(initialFolder).filter(
    (candidate) => candidate !== "\\" && !pipelineFolders.includes(candidate)
  );

  const [name, setName] = useState(initialDraft?.name || "");
  const [selectedRepoId, setSelectedRepoId] = useState(initialDraft?.repositoryId || "");
  const [yamlPath, setYamlPath] = useState(initialYamlPath);
  const [folder, setFolder] = useState(initialFolder);
  const [entryMode, setEntryMode] = useState<PipelineYamlEntryMode>(
    initialDraft?.entryMode || "existing-yaml"
  );
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [folderPickerPath, setFolderPickerPath] = useState(initialFolder);
  const [folderHistory, setFolderHistory] = useState<string[]>(buildFolderHistory(initialFolder));
  const [createdFolders, setCreatedFolders] = useState<string[]>(initialMissingFolderChain);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderError, setNewFolderError] = useState<string | null>(null);
  const selectedRepo =
    repositories?.find((candidate) => candidate.id === selectedRepoId) ||
    (selectedRepoId
      ? {
          id: selectedRepoId,
          name:
            initialDraft?.repositoryId === selectedRepoId
              ? initialDraft.repositoryName
              : repositories?.find((candidate) => candidate.id === selectedRepoId)?.name || "",
          defaultBranch:
            initialDraft?.repositoryId === selectedRepoId
              ? `refs/heads/${initialDraft.defaultBranch}`
              : repositories?.find((candidate) => candidate.id === selectedRepoId)?.defaultBranch,
        }
      : (repositories?.[0] ?? null));

  const availableFolders = useMemo(
    () => Array.from(new Set(["\\", ...pipelineFolders, ...createdFolders])),
    [createdFolders, pipelineFolders]
  );
  const currentFolderChildren = useMemo(
    () => getFolderChildren(availableFolders, folderPickerPath),
    [availableFolders, folderPickerPath]
  );

  const handleClose = () => {
    if (isPending) return;
    setFolderPickerOpen(false);
    onClose();
  };

  const handleDirectCreate = () => {
    if (!name.trim() || !selectedRepo) return;
    onSubmit({
      name: name.trim(),
      folder: folder || "\\",
      yamlPath: normalizeYamlPath(yamlPath),
      repositoryId: selectedRepo.id,
      repositoryName: selectedRepo.name,
    });
  };

  const handleStartEditor = () => {
    if (!name.trim() || !selectedRepo) return;
    onStartEditor({
      name: name.trim(),
      folder: folder || "\\",
      yamlPath: normalizeYamlPath(yamlPath),
      repositoryId: selectedRepo.id,
      repositoryName: selectedRepo.name,
      defaultBranch: (selectedRepo.defaultBranch || "refs/heads/main").replace("refs/heads/", ""),
      entryMode: "new-yaml",
      editorContent: initialDraft?.editorContent || "",
      fileExistsOnDefaultBranch: initialDraft?.fileExistsOnDefaultBranch ?? null,
    });
  };

  const handleCreateFolder = () => {
    const trimmedName = newFolderName.trim();
    const validationError = getNewFolderError(trimmedName);
    if (validationError) {
      setNewFolderError(validationError);
      return;
    }

    const nextFolderPath = buildChildFolderPath(folderPickerPath, trimmedName);
    if (availableFolders.includes(nextFolderPath)) {
      setNewFolderError("Der Ordner existiert bereits.");
      return;
    }

    setCreatedFolders((current) => [...current, nextFolderPath]);
    setFolderHistory((current) => [...current, folderPickerPath]);
    setFolderPickerPath(nextFolderPath);
    setNewFolderName("");
    setNewFolderError(null);
    setCreatingFolder(false);
  };

  const handleOpenFolderPicker = () => {
    setFolderPickerPath(folder || "\\");
    setFolderHistory(buildFolderHistory(folder || "\\"));
    setFolderPickerOpen(true);
    setCreatingFolder(false);
    setNewFolderName("");
    setNewFolderError(null);
  };

  const isInvalid = !name.trim() || !selectedRepo;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={folderPickerOpen ? "Ordner wählen" : "Neue Pipeline erstellen"}
    >
      {folderPickerOpen ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (folderPickerPath === "\\") {
                  setFolderPickerOpen(false);
                  return;
                }
                const prev = folderHistory[folderHistory.length - 1] ?? "\\";
                setFolderPickerPath(prev);
                setFolderHistory((current) => current.slice(0, -1));
              }}
              className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="flex-1 truncate font-mono text-xs text-slate-400">{folderPickerPath}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setFolder(folderPickerPath);
              setFolderPickerOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 px-3 py-2.5 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-600/25"
          >
            <FolderOpen size={15} />
            Diesen Ordner wählen
            <span className="ml-auto max-w-[45%] truncate font-mono text-xs text-blue-400/70">
              {folderPickerPath}
            </span>
          </button>

          <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Plus size={14} className="flex-shrink-0 text-blue-400" />
                <span className="truncate text-sm text-slate-200">Neuen Unterordner erstellen</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreatingFolder((current) => !current);
                  setNewFolderName("");
                  setNewFolderError(null);
                }}
                className="flex-shrink-0 text-xs text-blue-400 transition-colors hover:text-blue-300"
              >
                {creatingFolder ? "Abbrechen" : "Neu"}
              </button>
            </div>
            {creatingFolder && (
              <div className="space-y-2.5 border-t border-slate-700/50 px-3 py-3">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value);
                    if (newFolderError) setNewFolderError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateFolder();
                    }
                  }}
                  placeholder="z.B. delivery"
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                {newFolderError && <p className="text-xs text-red-400">{newFolderError}</p>}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setCreatingFolder(false);
                      setNewFolderName("");
                      setNewFolderError(null);
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button className="flex-1" onClick={handleCreateFolder}>
                    <Plus size={15} />
                    Ordner erstellen
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700/50">
            <div className="divide-y divide-slate-800/50">
              {currentFolderChildren.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => {
                    setFolderHistory((current) => [...current, folderPickerPath]);
                    setFolderPickerPath(candidate);
                  }}
                  className="flex w-full items-center gap-3 bg-slate-800/40 px-3 py-3 text-left transition-colors hover:bg-slate-800/80"
                >
                  <FolderOpen size={16} className="flex-shrink-0 text-blue-400" />
                  <span className="flex-1 truncate text-sm text-slate-200">
                    {folderDisplayName(candidate)}
                  </span>
                  <ChevronRight size={15} className="flex-shrink-0 text-slate-600" />
                </button>
              ))}
              {currentFolderChildren.length === 0 && (
                <p className="bg-slate-800/40 px-3 py-4 text-sm text-slate-500">
                  Keine Unterordner vorhanden
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meine Pipeline"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">YAML-Modus</label>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
              {[
                { key: "existing-yaml" as const, label: "Vorhandene YAML" },
                { key: "new-yaml" as const, label: "Neue YAML-Datei" },
              ].map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setEntryMode(mode.key)}
                  className={`rounded-[0.9rem] py-2.5 text-xs font-medium transition-colors ${
                    entryMode === mode.key ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-400"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              {entryMode === "existing-yaml"
                ? "Erstellt direkt eine Pipeline-Definition für eine vorhandene YAML-Datei."
                : "Öffnet einen Editor, schreibt die YAML-Datei und committed sie vor dem Erstellen."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Repository</label>
            <div className="max-h-40 divide-y divide-slate-700/50 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800">
              {(repositories || []).map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedRepoId(candidate.id)}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedRepo?.id === candidate.id
                      ? "bg-blue-600/20 text-blue-300"
                      : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  {candidate.name}
                </button>
              ))}
              {!repositories?.length && (
                <p className="px-3 py-2.5 text-sm text-slate-500">Keine Repositories gefunden</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">YAML-Pfad</label>
            <input
              type="text"
              value={yamlPath}
              onChange={(e) => setYamlPath(e.target.value)}
              placeholder="/azure-pipelines.yml"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Ordner <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <button
              type="button"
              onClick={handleOpenFolderPicker}
              className="flex w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-left text-sm transition-colors hover:border-slate-500"
            >
              <FolderOpen size={15} className="flex-shrink-0 text-slate-400" />
              <span className={folder === "\\" ? "text-slate-500" : "font-mono text-slate-100"}>
                {folder === "\\" ? "Stammordner (Standard)" : folder}
              </span>
              <ChevronRight size={15} className="ml-auto flex-shrink-0 text-slate-600" />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={isPending}>
              Abbrechen
            </Button>
            {entryMode === "existing-yaml" ? (
              <Button
                className="flex-1"
                loading={isPending}
                disabled={isInvalid || isPending}
                onClick={handleDirectCreate}
              >
                <Plus size={16} />
                Erstellen
              </Button>
            ) : (
              <Button className="flex-1" disabled={isInvalid} onClick={handleStartEditor}>
                <Plus size={16} />
                Weiter zum Editor
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
