"use client";

import { useEffect } from "react";
import { GitBranch } from "lucide-react";
import { SelectionSheet } from "@/components/ui/SelectionSheet";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { usePRRepoStore } from "@/lib/stores/selectionStore";
import { selectionLabel } from "@/lib/utils/selectionLabel";

/**
 * Repository-Multiselect-Selektor fuer die Pull-Requests-Seite.
 * Erlaubt Mehrfachauswahl mit Favoriten-Filter.
 */
// Repo-Selektor fuer die PR-Seite (Mehrfachauswahl)
export function PRRepoSelector() {
  const { repositories, favorites, toggleFavorite } = useRepositoryStore();
  const { selectedIds, toggle, clear, load } = usePRRepoStore();

  // Gespeicherte Auswahl beim ersten Mount laden
  useEffect(() => { load(); }, [load]);

  const items = repositories.map((r) => ({
    id: r.id,
    label: r.name,
    sublabel: r.project?.name,
  }));

  // Label: zeigt Auswahl-Zusammenfassung
  const buttonLabel = selectionLabel(
    selectedIds,
    "Alle Repos",
    repositories.find((r) => r.id === selectedIds[0])?.name,
    `${selectedIds.length} Repos`,
  );

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<GitBranch size={13} className="text-blue-400" />}
      sheetTitle="Repositories auswaehlen"
      items={items}
      selectedIds={selectedIds}
      onToggle={toggle}
      onClear={clear}
      multiSelect={true}
      favoriteIds={favorites}
      onToggleFavorite={toggleFavorite}
      emptyMessage="Keine Repositories gefunden"
    />
  );
}
