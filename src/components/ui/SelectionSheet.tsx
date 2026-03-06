"use client";

import { useState } from "react";
import { Check, Star, ChevronDown } from "lucide-react";
import { Sheet } from "./Sheet";
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
    <>
      {/* AppBar-Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors max-w-[180px]"
      >
        {buttonIcon && <span className="flex-shrink-0">{buttonIcon}</span>}
        <span className="text-xs font-medium text-slate-200 truncate">{buttonLabel}</span>
        <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={sheetTitle}>
        {/* Favoriten / Alle Umschalter (nur bei Repos) */}
        {hasFavorites && (
          <div className="flex gap-2 px-4 py-3 border-b border-slate-800">
            <button
              onClick={() => setShowAll(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!showAll ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              Favoriten
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${showAll ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              Alle
            </button>
          </div>
        )}

        {/* Alle-Option bei Multi-Select */}
        {multiSelect && selectedIds.length > 0 && (
          <button
            onClick={() => { onClear?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-400 border-b border-slate-800 hover:bg-slate-800/40 transition-colors"
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
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-blue-950/30" : "hover:bg-slate-800/40"}`}
                >
                  {/* Auswahl-Button */}
                  <button
                    className="flex-1 flex items-center gap-3 text-left min-h-[44px]"
                    onClick={() => handleSelect(item)}
                  >
                    {/* Auswahlkreis */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                      {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.label}</p>
                      {item.sublabel && (
                        <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                      )}
                    </div>
                  </button>

                  {/* Favoriten-Stern (nur wenn unterstuetzt) */}
                  {hasFavorites && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite!(item.id); }}
                      className="p-2 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0"
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {selectedIds.length} {selectedIds.length === 1 ? "Eintrag" : "Eintraege"} ausgewaehlt
            </button>
          </div>
        )}
        <div className="h-8" />
      </Sheet>
    </>
  );
}
