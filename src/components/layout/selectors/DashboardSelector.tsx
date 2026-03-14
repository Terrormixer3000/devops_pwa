"use client";

import { useEffect } from "react";
import { LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { SelectionSheet } from "@/components/ui/SelectionSheet";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useDashboardRepoStore } from "@/lib/stores/selectionStore";
import { selectionLabel } from "@/lib/utils/selectionLabel";

/**
 * Repository-Selektor fuer das Dashboard.
 * Die Auswahl filtert gleichzeitig PRs und Builds auf der Dashboard-Seite.
 */
// Repo-Selektor fuer das Dashboard (Mehrfachauswahl, gilt fuer PRs + Builds)
export function DashboardSelector() {
  const { repositories, favorites, toggleFavorite } = useRepositoryStore();
  const { selectedIds, toggle, clear, load } = useDashboardRepoStore();
  const t = useTranslations("selectors");

  // Gespeicherte Auswahl beim ersten Mount laden
  useEffect(() => { load(); }, [load]);

  const items = repositories.map((r) => ({
    id: r.id,
    label: r.name,
    sublabel: r.project?.name,
  }));

  const buttonLabel = selectionLabel(
    selectedIds,
    t("allRepos"),
    repositories.find((r) => r.id === selectedIds[0])?.name,
    t("multipleRepos", { count: selectedIds.length }),
  );

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<LayoutDashboard size={13} className="text-blue-400" />}
      sheetTitle={t("reposSheet")}
      items={items}
      selectedIds={selectedIds}
      onToggle={toggle}
      onClear={clear}
      multiSelect={true}
      favoriteIds={favorites}
      onToggleFavorite={toggleFavorite}
      emptyMessage={t("noReposFound")}
    />
  );
}
