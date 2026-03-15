"use client";

import { ProjectChip } from "./ProjectChip";

/** Props fuer die AppBar. */
// AppBar: obere Leiste mit Seitentitel und optionalem rechten Slot fuer den Tab-spezifischen Selektor
interface Props {
  title: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function AppBar({ title, rightSlot }: Props) {
  return (
    <header className="fixed left-0 right-0 z-40 border-b border-slate-700/70 bg-slate-900/84 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-2xl" style={{ top: "var(--offline-banner-height, 0px)" }}>
      <div
        className="px-4"
        style={{
          paddingTop: "var(--safe-area-top-effective)",
          paddingBottom: "var(--app-bar-bottom-padding)",
        }}
      >
        <div className="flex h-[var(--app-bar-content-height)] items-center gap-3">
          {/* Seitentitel oder titelspezifischer Selector, darunter optionaler Projekt-Chip */}
          <div className="min-w-0 flex-1 flex flex-col justify-center items-start">
            {typeof title === "string" ? (
              <h1 className="w-full truncate text-[17px] font-semibold tracking-[-0.01em] text-slate-100 leading-snug">{title}</h1>
            ) : (
              title
            )}
            <ProjectChip />
          </div>

          {/* Tab-spezifischer Selektor (z.B. Repo, Pipeline, Release) */}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
