"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, Pencil, X, Trash2, Pen } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { isImagePath, isMarkdownPath } from "@/lib/utils/fileTypes";
import { buildImageTextRepresentation } from "@/lib/utils/imageText";

/** Dateiinhalt-Anzeige: Rendert Markdown, Bilder oder Plain-Text je nach Dateityp. */
export function FileViewer({
  content,
  imageDataUrl,
  error,
  path,
  loading,
  onOpenHistory,
  editMode = false,
  editedContent,
  onEditStart,
  onEditCancel,
  onEditChange,
  onRequestCommit,
  onDeleteFile,
  onRenameFile,
}: {
  content: string;
  imageDataUrl?: string | null;
  error?: string | null;
  path: string;
  loading: boolean;
  onOpenHistory?: (filePath: string) => void;
  editMode?: boolean;
  editedContent?: string | null;
  onEditStart?: (initialContent: string) => void;
  onEditCancel?: () => void;
  onEditChange?: (content: string) => void;
  onRequestCommit?: () => void;
  onDeleteFile?: () => void;
  onRenameFile?: (newPath: string) => void;
}) {
  const t = useTranslations("explorer");
  const [mode, setMode] = useState<"preview" | "text">("preview");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} />;

  const lines = content.split("\n");
  const isImage = isImagePath(path);
  const isMarkdown = isMarkdownPath(path);
  const rawText = isImage ? buildImageTextRepresentation(imageDataUrl, path) : content;
  const rawLines = rawText.split("\n");
  const canEdit = !isImage;

  return (
    <div>
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-mono text-slate-400 truncate flex-1 min-w-0">{path}</p>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {onOpenHistory && !editMode && (
            <button
              onClick={() => onOpenHistory(path)}
              title={t("fileHistory")}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
            >
              <History size={14} />
            </button>
          )}
          {canEdit && !editMode && onEditStart && (
            <button
              onClick={() => onEditStart(content)}
              title={t("edit")}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-yellow-400 transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}
          {!editMode && onRenameFile && (
            <button
              onClick={() => { setNewFileName(path.split("/").pop() || ""); setRenameOpen(true); }}
              title={t("renameFile")}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
            >
              <Pen size={14} />
            </button>
          )}
          {!editMode && onDeleteFile && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              title={t("deleteFile")}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {editMode && (
            <>
              <button
                onClick={onRequestCommit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                {t("save")}
              </button>
              <button
                onClick={onEditCancel}
                title={t("cancel")}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {editMode ? (
        <textarea
          className="w-full min-h-[60vh] bg-slate-950 text-slate-200 text-xs font-mono p-4 resize-none focus:outline-none border-0"
          value={editedContent ?? content}
          onChange={(e) => onEditChange?.(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
      ) : (isImage || isMarkdown) ? (
        <>
          <div className="flex items-center justify-end px-3 py-2 border-b border-slate-800/70">
            <div className="inline-flex rounded-lg border border-slate-700/70 bg-slate-900/70 p-1">
              {[
                { key: "preview", label: t("preview") },
                { key: "text", label: t("text") },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMode(item.key as "preview" | "text")}
                  className={`rounded-md px-3 py-1 text-xs transition-colors ${
                    mode === item.key ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {mode === "preview" && isImage ? (
            <div className="p-3">
              <ImageViewer src={imageDataUrl} emptyMessage={t("imageLoadError")} />
            </div>
          ) : mode === "preview" && isMarkdown ? (
            <div className="px-4 py-4">
              <MarkdownViewer content={content} />
            </div>
          ) : (
            <CodeTable lines={rawLines} />
          )}
        </>
      ) : (
        <CodeTable lines={lines} />
      )}

      {/* Löschen-Bestätigungsdialog */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t("deleteFile")}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">{t("confirmDelete")}</p>
          <p className="text-xs text-slate-500 font-mono">{path}</p>
          <Button
            fullWidth
            variant="danger"
            onClick={() => { setDeleteConfirmOpen(false); onDeleteFile?.(); }}
          >
            <Trash2 size={16} /> {t("deleteFile")}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Modal>

      {/* Umbenennen-Sheet */}
      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={t("renameFile")}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">{t("newName")}</label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
            />
          </div>
          <Button
            fullWidth
            disabled={!newFileName.trim() || newFileName.trim() === path.split("/").pop()}
            onClick={() => {
              if (!newFileName.trim()) return;
              // Verzeichnispfad beibehalten, nur Dateiname aendern
              const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
              const newPath = dir ? `${dir}/${newFileName.trim()}` : `/${newFileName.trim()}`;
              setRenameOpen(false);
              onRenameFile?.(newPath);
            }}
          >
            {t("renameFile")}
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setRenameOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CodeTable({ lines }: { lines: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-slate-800/30">
              <td className="select-none px-3 py-0.5 text-right text-slate-600 border-r border-slate-800 min-w-[48px] w-[48px]">
                {i + 1}
              </td>
              <td className="px-3 py-0.5 text-slate-300 whitespace-pre">{line || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
