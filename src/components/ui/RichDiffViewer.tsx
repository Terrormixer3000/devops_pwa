"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UnifiedDiffViewer } from "@/components/ui/UnifiedDiffViewer";
import { MarkdownViewer } from "@/components/ui/MarkdownViewer";
import { ImageDiffViewer } from "@/components/ui/ImageViewer";
import { isImagePath, isMarkdownPath } from "@/lib/utils/fileTypes";
import { buildImageTextRepresentation } from "@/lib/utils/imageText";

/**
 * Intelligenter Diff-Viewer der je nach Dateityp die passende Darstellung waehlt:
 * - Bilder: Seite-an-Seite Bildvergleich
 * - Markdown: Umschalter zwischen Vorschau und Text-Diff
 * - Sonstige: Unified Text-Diff
 */
interface Props {
  path: string;
  title: string;
  oldContent: string;
  newContent: string;
  oldLabel: string;
  newLabel: string;
  oldImageSrc?: string | null;
  newImageSrc?: string | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function RichDiffViewer({
  path,
  title,
  oldContent,
  newContent,
  oldLabel,
  newLabel,
  oldImageSrc,
  newImageSrc,
  loading = false,
  error,
  emptyMessage,
}: Props) {
  const t = useTranslations("explorer");
  const isImage = isImagePath(path);
  const isMarkdown = isMarkdownPath(path);
  const supportsPreviewToggle = isImage || isMarkdown;
  const [mode, setMode] = useState<"preview" | "text">(isImage ? "preview" : "text");
  const oldImageText = buildImageTextRepresentation(oldImageSrc, oldLabel);
  const newImageText = buildImageTextRepresentation(newImageSrc, newLabel);

  if (!supportsPreviewToggle) {
    return (
      <UnifiedDiffViewer
        title={title}
        oldContent={oldContent}
        newContent={newContent}
        oldLabel={oldLabel}
        newLabel={newLabel}
        loading={loading}
        error={error}
        emptyMessage={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end px-1">
        <div className="inline-flex rounded-lg border border-slate-700/70 bg-slate-900/70 p-1">
          {[
            { key: "preview", label: t("preview") },
            { key: "text", label: t("text") },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setMode(item.key as "preview" | "text")}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                mode === item.key
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "preview" && isImage ? (
        <ImageDiffViewer
          title={title}
          oldLabel={oldLabel}
          newLabel={newLabel}
          oldSrc={oldImageSrc}
          newSrc={newImageSrc}
          loading={loading}
          error={error}
        />
      ) : mode === "preview" && isMarkdown ? (
        <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70">
          <div className="border-b border-slate-800/80 px-3 py-2.5">
            <p className="truncate text-xs font-mono text-slate-300">{title}</p>
            <p className="mt-1 text-[11px] text-slate-500">{t("markdownPreview")}</p>
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-700/70">
              <div className="border-b border-slate-800/80 px-3 py-2 text-[11px] text-slate-500">{oldLabel}</div>
              <div className="max-h-[48vh] overflow-auto px-4 py-3">
                <MarkdownViewer content={oldContent} />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700/70">
              <div className="border-b border-slate-800/80 px-3 py-2 text-[11px] text-slate-500">{newLabel}</div>
              <div className="max-h-[48vh] overflow-auto px-4 py-3">
                <MarkdownViewer content={newContent} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <UnifiedDiffViewer
          title={title}
          oldContent={isImage ? oldImageText : oldContent}
          newContent={isImage ? newImageText : newContent}
          oldLabel={oldLabel}
          newLabel={newLabel}
          loading={loading}
          error={error}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
}
