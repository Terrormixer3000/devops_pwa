"use client";

import { useState } from "react";
import { History, Pencil, X } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";
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
}) {
  const [mode, setMode] = useState<"preview" | "text">("preview");

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
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {onOpenHistory && !editMode && (
            <button
              onClick={() => onOpenHistory(path)}
              title="Dateihistorie"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors"
            >
              <History size={14} />
            </button>
          )}
          {canEdit && !editMode && onEditStart && (
            <button
              onClick={() => onEditStart(content)}
              title="Bearbeiten"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-yellow-400 transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}
          {editMode && (
            <>
              <button
                onClick={onRequestCommit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                Speichern
              </button>
              <button
                onClick={onEditCancel}
                title="Abbrechen"
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
                { key: "preview", label: "Vorschau" },
                { key: "text", label: "Text" },
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
              <ImageViewer src={imageDataUrl} emptyMessage="Bild konnte nicht geladen werden" />
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
