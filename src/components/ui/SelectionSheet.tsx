"use client";

import { useEffect, useState } from "react";
import { Check, Star, ChevronDown, X } from "lucide-react";
import { Drawer } from "vaul";
import { LoadingSpinner } from "./LoadingSpinner";

// Ein einzelner Auswahl-Eintrag
export interface SelectionItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  // Angezeigtes Label und Icon im AppBar-Button
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  sheetTitle: string;

  // Verfuegbare Eintraege
  items: SelectionItem[];
  loading?: boolean;

  // Aktuell ausgewaehlte IDs (leer = alle zeigen)
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClear?: () => void;

  // Modus
  multiSelect?: boolean;

  // Optionale Favoriten-Unterstuetzung (fuer Repositories)
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;

  emptyMessage?: string;
}

export function SelectionSheet({
  buttonLabel,
  buttonIcon,
  sheetTitle,
  items,
  loading,
  selectedIds,
  onToggle,
  onClear,
  multiSelect = true,
  favoriteIds,
  onToggleFavorite,
  emptyMessage = "Keine Eintraege gefunden",
}: Props) {
  const [open, setOpen] = useState(false);
  // Filtermodus: Favoriten oder alle anzeigen
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const hasFavorites = !!favoriteIds && !!onToggleFavorite;

  // Angezeigte Eintraege: Favoriten oder alle
  const displayed = hasFavorites && !showAll && favoriteIds!.length > 0
    ? items.filter((i) => favoriteIds!.includes(i.id))
    : items;

  const handleSelect = (item: SelectionItem) => {
    if (!multiSelect) {
      // Bei Einfachauswahl: nur dieses Item auswaehlen, Sheet schliessen
      onClear?.();
      onToggle(item.id);
      setOpen(false);
    } else {
      onToggle(item.id);
    }
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      direction="bottom"
      modal={true}
      noBodyStyles={true}
      handleOnly={true}
      shouldScaleBackground={false}
    >
      <Drawer.Trigger asChild>
        {/* AppBar-Button */}
        <button
          className="flex max-w-[190px] items-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/80 px-3.5 py-2 text-left shadow-[0_8px_22px_rgba(0,0,0,0.18)] transition-colors hover:bg-slate-700/85"
        >
          {buttonIcon && <span className="flex-shrink-0">{buttonIcon}</span>}
          <span className="truncate text-xs font-medium tracking-[-0.01em] text-slate-200">{buttonLabel}</span>
          <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md" />
        <Drawer.Content
          className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] border border-slate-700/70 bg-slate-900 shadow-[0_-14px_40px_rgba(0,0,0,0.34)]"
          style={{
            maxHeight: "calc(var(--selection-sheet-max-height) + var(--bottom-nav-height))",
          }}
        >
          {/* Vaul uebernimmt die Swipe-Logik, wir gestalten nur den sichtbaren Handle-Bereich. */}
          <div className="flex justify-center pt-2.5 pb-1">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-slate-500/80" />
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
            <Drawer.Title className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">
              {sheetTitle}
            </Drawer.Title>
            <Drawer.Close asChild>
              <button
                className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition-colors hover:bg-slate-700/80"
              >
                <X size={16} />
              </button>
            </Drawer.Close>
          </div>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom-effective))" }}
          >
        {/* Favoriten / Alle Umschalter (nur bei Repos) */}
        {hasFavorites && (
          <div className="border-b border-slate-800 px-4 py-3">
            {/* Segmentierte Steuerung orientiert sich an iOS und bleibt in der bestehenden Farbwelt. */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/90 p-1">
            <button
              onClick={() => setShowAll(false)}
              className={`rounded-[0.9rem] py-2.5 text-sm font-medium transition-colors ${!showAll ? "bg-slate-700 text-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.18)]" : "text-slate-400"}`}
            >
              Favoriten
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`rounded-[0.9rem] py-2.5 text-sm font-medium transition-colors ${showAll ? "bg-slate-700 text-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.18)]" : "text-slate-400"}`}
            >
              Alle
            </button>
            </div>
          </div>
        )}

        {/* Alle-Option bei Multi-Select */}
        {multiSelect && selectedIds.length > 0 && (
          <button
            onClick={() => { onClear?.(); }}
            className="w-full flex items-center gap-3 border-b border-slate-800 px-4 py-3 text-sm text-blue-400 transition-colors hover:bg-slate-800/40"
          >
            Alle anzeigen (Auswahl aufheben)
          </button>
        )}

        {/* Ladeindikator */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        ) : displayed.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {displayed.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isFav = favoriteIds?.includes(item.id) ?? false;
              return (
                <div
                  key={item.id}
                  className={`mx-2 my-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${isSelected ? "bg-blue-950/30 ring-1 ring-blue-500/20" : "hover:bg-slate-800/40"}`}
                >
                  {/* Auswahl-Button */}
                  <button
                    className="flex-1 flex items-center gap-3 text-left min-h-[44px]"
                    onClick={() => handleSelect(item)}
                  >
                    {/* Auswahlkreis */}
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                      {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{item.label}</p>
                      {item.sublabel && (
                        <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                      )}
                    </div>
                  </button>

                  {/* Favoriten-Stern (nur wenn unterstuetzt) */}
                  {hasFavorites && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite!(item.id); }}
                      className="flex-shrink-0 rounded-full p-2 transition-colors hover:bg-slate-700"
                    >
                      <Star
                        size={17}
                        className={isFav ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bestaetigen-Button bei Multi-Select */}
        {multiSelect && selectedIds.length > 0 && (
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-2xl border border-blue-400/30 bg-blue-600 py-3.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(0,120,212,0.28)] transition-colors hover:bg-blue-500"
            >
              {selectedIds.length} {selectedIds.length === 1 ? "Eintrag" : "Eintraege"} ausgewaehlt
            </button>
          </div>
        )}
        <div className="h-8" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
