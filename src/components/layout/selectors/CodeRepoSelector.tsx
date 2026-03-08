"use client";

import { GitBranch } from "lucide-react";
import { SelectionSheet } from "@/components/ui/SelectionSheet";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";

/**
 * Repository-Selektor fuer den Code-Explorer.
 * Im Gegensatz zu anderen Selektoren erlaubt er nur Einfachauswahl.
 */
// Repo-Selektor fuer den Code Explorer (Einfachauswahl)
export function CodeRepoSelector() {
  const { repositories, favorites, toggleFavorite, setSingleRepo, clearSelection, selectedRepositories } =
    useRepositoryStore();

  const selectedRepo = selectedRepositories[0];

  const items = repositories.map((r) => ({
    id: r.id,
    label: r.name,
    sublabel: r.project?.name,
  }));

  // Label: ausgewaehltes Repo oder Hinweis
  const buttonLabel = selectedRepo?.name ?? "Repo waehlen";

  const handleToggle = (id: string) => {
    const repo = repositories.find((r) => r.id === id);
    if (repo) setSingleRepo(repo);
  };

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<GitBranch size={13} className="text-blue-400" />}
      sheetTitle="Repository auswaehlen"
      items={items}
      selectedIds={selectedRepo ? [selectedRepo.id] : []}
      onToggle={handleToggle}
      onClear={clearSelection}
      multiSelect={false}
      favoriteIds={favorites}
      onToggleFavorite={toggleFavorite}
      emptyMessage="Keine Repositories gefunden"
    />
  );
}
