"use client";

import { useEffect } from "react";
import { Rocket } from "lucide-react";
import { SelectionSheet, SelectionItem } from "@/components/ui/SelectionSheet";
import { useReleaseDefStore, useReleaseFavStore } from "@/lib/stores/selectionStore";
import { ReleaseDefinition } from "@/types";

/** Props fuer den Release-Selektor. */
interface Props {
  // Release-Definitionen werden von der Releases-Seite uebergeben
  definitions: ReleaseDefinition[];
  loading?: boolean;
}

/**
 * Release-Selector im AppBar: erlaubt Mehrfachauswahl von Release-Pipeline-Definitionen
 * mit Favoriten-Unterstuetzung.
 */
// Release-Selektor: Mehrfachauswahl von Release-Pipelines mit Favoriten
export function ReleaseSelector({ definitions, loading }: Props) {
  const { selectedIds, toggle, clear, load } = useReleaseDefStore();
  const { favoriteIds, toggleFavorite, load: loadFavs } = useReleaseFavStore();

  // Gespeicherte Auswahl und Favoriten beim ersten Mount laden
  useEffect(() => { load(); loadFavs(); }, [load, loadFavs]);

  const items: SelectionItem[] = definitions.map((d) => ({
    id: String(d.id),
    label: d.name,
    sublabel: d.description,
  }));

  // Label: Zusammenfassung der ausgewaehlten Release-Pipelines
  const buttonLabel =
    selectedIds.length === 0
      ? "Alle Releases"
      : selectedIds.length === 1
      ? (definitions.find((d) => String(d.id) === selectedIds[0])?.name ?? "1 Pipeline")
      : `${selectedIds.length} Pipelines`;

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<Rocket size={13} className="text-purple-400" />}
      sheetTitle="Release-Pipelines auswaehlen"
      items={items}
      loading={loading}
      selectedIds={selectedIds}
      onToggle={toggle}
      onClear={clear}
      multiSelect={true}
      favoriteIds={favoriteIds}
      onToggleFavorite={toggleFavorite}
      emptyMessage="Keine Release-Pipelines gefunden"
    />
  );
}
