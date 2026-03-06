"use client";

// AppBar: obere Leiste mit Seitentitel und optionalem rechten Slot fuer den Tab-spezifischen Selektor
interface Props {
  title: string;
  rightSlot?: React.ReactNode;
}

export function AppBar({ title, rightSlot }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 safe-area-top">
      <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
        {/* Seitentitel */}
        <h1 className="text-base font-semibold text-white flex-1 truncate">{title}</h1>

        {/* Tab-spezifischer Selektor (z.B. Repo, Pipeline, Release) */}
        {rightSlot}
      </div>
    </header>
  );
}
