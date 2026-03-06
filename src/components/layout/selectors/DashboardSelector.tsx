"use client";

import { useEffect } from "react";
import { LayoutDashboard } from "lucide-react";
import { SelectionSheet } from "@/components/ui/SelectionSheet";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useDashboardRepoStore } from "@/lib/stores/selectionStore";

// Repo-Selektor fuer das Dashboard (Mehrfachauswahl, gilt fuer PRs + Builds)
export function DashboardSelector() {
  const { repositories, favorites, toggleFavorite } = useRepositoryStore();
  const { selectedIds, toggle, clear, load } = useDashboardRepoStore();

  // Gespeicherte Auswahl beim ersten Mount laden
  useEffect(() => { load(); }, [load]);

  const items = repositories.map((r) => ({
    id: r.id,
    label: r.name,
    sublabel: r.project?.name,
  }));

  const buttonLabel =
    selectedIds.length === 0
      ? "Alle Repos"
      : selectedIds.length === 1
      ? (repositories.find((r) => r.id === selectedIds[0])?.name ?? "1 Repo")
      : `${selectedIds.length} Repos`;

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<LayoutDashboard size={13} className="text-blue-400" />}
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
