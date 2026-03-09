"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Image from "next/image";

/** Props fuer den Einzelbild-Viewer. */
interface Props {
  title?: string;
  label?: string;
  src?: string | null;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

/** Zeigt ein einzelnes Bild (z.B. aus dem Repository) mit Lade- und Fehler-Fallback an. */
export function ImageViewer({
  title,
  label,
  src,
  loading = false,
  error,
  emptyMessage = "Keine Bilddaten vorhanden",
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70">
      {title || label ? (
        <div className="border-b border-slate-800/80 px-3 py-2.5">
          {title ? <p className="truncate text-xs font-mono text-slate-300">{title}</p> : null}
          {label ? <p className="mt-1 text-[11px] text-slate-500">{label}</p> : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-red-400">{error}</p>
      ) : !src ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="p-3">
          <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/70">
            <Image
              src={src}
              alt={title || "Bild"}
              width={1600}
              height={900}
              unoptimized
              className="mx-auto max-h-[60vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Props fuer den nebeneinander dargestellten Vor/Nach-Vergleich von Bildern. */
interface DiffProps {
  title: string;
  oldLabel: string;
  newLabel: string;
  oldSrc?: string | null;
  newSrc?: string | null;
  loading?: boolean;
  error?: string | null;
}

/** Zeigt Alt- und Neuzustand eines Bildes nebeneinander fuer einfachen visuellen Vergleich. */
export function ImageDiffViewer({
  title,
  oldLabel,
  newLabel,
  oldSrc,
  newSrc,
  loading = false,
  error,
}: DiffProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70">
      <div className="border-b border-slate-800/80 px-3 py-2.5">
        <p className="truncate text-xs font-mono text-slate-300">{title}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-red-400">{error}</p>
      ) : (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          <ImageViewer
            title="Vorher"
            label={oldLabel}
            src={oldSrc}
            emptyMessage="Kein vorheriges Bild verfügbar"
          />
          <ImageViewer
            title="Nachher"
            label={newLabel}
            src={newSrc}
            emptyMessage="Kein neues Bild verfügbar"
          />
        </div>
      )}
    </div>
  );
}
