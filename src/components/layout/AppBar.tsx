"use client";

// AppBar: obere Leiste mit Seitentitel und optionalem rechten Slot fuer den Tab-spezifischen Selektor
interface Props {
  title: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function AppBar({ title, rightSlot }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-700/70 bg-slate-900/84 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
      <div
        className="px-4"
        style={{
          paddingTop: "var(--safe-area-top-effective)",
          paddingBottom: "var(--app-bar-bottom-padding)",
        }}
      >
        <div className="flex h-[var(--app-bar-content-height)] items-center gap-3">
          {/* Seitentitel oder titelspezifischer Selector */}
          <div className="min-w-0 flex-1">
            {typeof title === "string" ? (
              <h1 className="truncate text-[18px] font-semibold tracking-[-0.01em] text-slate-100">{title}</h1>
            ) : (
              title
            )}
          </div>

          {/* Tab-spezifischer Selektor (z.B. Repo, Pipeline, Release) */}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
