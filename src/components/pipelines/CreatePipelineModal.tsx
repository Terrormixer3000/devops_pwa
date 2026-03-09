"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, FolderOpen, Plus } from "lucide-react";

interface Repository { id: string; name: string; }

interface CreatePipelineData {
  name: string;
  folder: string;
  yamlPath: string;
  repositoryId: string;
  repositoryName: string;
}

/** Gibt direkte Kinder eines Ordner-Pfads zurück. */
function getFolderChildren(folders: string[], parentPath: string): string[] {
  const isRoot = parentPath === "\\";
  return folders.filter((f) => {
    if (f === "\\" || f === parentPath) return false;
    if (isRoot) return !f.slice(1).includes("\\");
    return f.startsWith(parentPath + "\\") && !f.slice(parentPath.length + 1).includes("\\");
  });
}

function folderDisplayName(path: string): string {
  if (path === "\\") return "Stammordner";
  return path.split("\\").filter(Boolean).pop() ?? path;
}

interface CreatePipelineModalProps {
  open: boolean;
  isPending: boolean;
  error: string | null;
  repositories: Repository[] | undefined;
  pipelineFolders: string[];
  onClose: () => void;
  onSubmit: (data: CreatePipelineData) => void;
}

/** Modal zum Erstellen einer neuen Pipeline-Definition mit Ordner-Picker. */
export function CreatePipelineModal({ open, isPending, error, repositories, pipelineFolders, onClose, onSubmit }: CreatePipelineModalProps) {
  const [name, setName] = useState("");
  const [repo, setRepo] = useState<Repository | null>(null);
  const [yamlPath, setYamlPath] = useState("/azure-pipelines.yml");
  const [folder, setFolder] = useState("\\");
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [folderPickerPath, setFolderPickerPath] = useState("\\");
  const [folderHistory, setFolderHistory] = useState<string[]>([]);

  const handleClose = () => {
    if (isPending) return;
    setName("");
    setRepo(null);
    setYamlPath("/azure-pipelines.yml");
    setFolder("\\");
    setFolderPickerOpen(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !repo) return;
    onSubmit({ name: name.trim(), folder: folder || "\\", yamlPath: yamlPath.trim() || "/azure-pipelines.yml", repositoryId: repo.id, repositoryName: repo.name });
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!isPending) { setFolderPickerOpen(false); handleClose(); } }}
      title={folderPickerOpen ? "Ordner wählen" : "Neue Pipeline erstellen"}
    >
      {folderPickerOpen ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (folderPickerPath === "\\") { setFolderPickerOpen(false); return; }
                const prev = folderHistory[folderHistory.length - 1] ?? "\\";
                setFolderPickerPath(prev);
                setFolderHistory((h) => h.slice(0, -1));
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-mono text-slate-400 truncate flex-1">{folderPickerPath}</span>
          </div>

          <button
            onClick={() => { setFolder(folderPickerPath); setFolderPickerOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-blue-500/40 bg-blue-600/15 text-blue-300 text-sm font-medium hover:bg-blue-600/25 transition-colors"
          >
            <FolderOpen size={15} />
            Diesen Ordner wählen
            <span className="ml-auto text-xs text-blue-400/70 font-mono truncate max-w-[45%]">{folderPickerPath}</span>
          </button>

          <div className="divide-y divide-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            {getFolderChildren(pipelineFolders, folderPickerPath).map((f) => (
              <button
                key={f}
                onClick={() => { setFolderHistory((h) => [...h, folderPickerPath]); setFolderPickerPath(f); }}
                className="w-full flex items-center gap-3 px-3 py-3 text-left bg-slate-800/40 hover:bg-slate-800/80 transition-colors"
              >
                <FolderOpen size={16} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm text-slate-200 flex-1 truncate">{folderDisplayName(f)}</span>
                <ChevronRight size={15} className="text-slate-600 flex-shrink-0" />
              </button>
            ))}
            {getFolderChildren(pipelineFolders, folderPickerPath).length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-500 bg-slate-800/40">Keine Unterordner vorhanden</p>
            )}
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
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Repository</label>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 divide-y divide-slate-700/50">
              {(repositories || []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRepo({ id: r.id, name: r.name })}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    repo?.id === r.id ? "bg-blue-600/20 text-blue-300" : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  {r.name}
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
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Ordner <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <button
              onClick={() => { setFolderPickerPath("\\"); setFolderHistory([]); setFolderPickerOpen(true); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-left transition-colors hover:border-slate-500"
            >
              <FolderOpen size={15} className="text-slate-400 flex-shrink-0" />
              <span className={folder === "\\" ? "text-slate-500" : "text-slate-100 font-mono"}>
                {folder === "\\" ? "Stammordner (Standard)" : folder}
              </span>
              <ChevronRight size={15} className="text-slate-600 ml-auto flex-shrink-0" />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={isPending}>
              Abbrechen
            </Button>
            <Button className="flex-1" loading={isPending} disabled={!name.trim() || !repo || isPending} onClick={handleSubmit}>
              <Plus size={16} />
              Erstellen
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
