"use client";

import { useEffect } from "react";
import { Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
import { SelectionSheet, SelectionItem } from "@/components/ui/SelectionSheet";
import { useReleaseDefStore, useReleaseFavStore } from "@/lib/stores/selectionStore";
import { ReleaseDefinition } from "@/types";
import { selectionLabel } from "@/lib/utils/selectionLabel";

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
  const t = useTranslations("selectors");

  // Gespeicherte Auswahl und Favoriten beim ersten Mount laden
  useEffect(() => { load(); loadFavs(); }, [load, loadFavs]);

  const items: SelectionItem[] = definitions.map((d) => ({
    id: String(d.id),
    label: d.name,
    sublabel: d.description,
  }));

  const buttonLabel = selectionLabel(
    selectedIds,
    t("allReleases"),
    definitions.find((d) => String(d.id) === selectedIds[0])?.name,
    t("multipleReleases", { count: selectedIds.length }),
  );

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<Rocket size={13} className="text-purple-400" />}
      sheetTitle={t("releasesSheet")}
      items={items}
      loading={loading}
      selectedIds={selectedIds}
      onToggle={toggle}
      onClear={clear}
      multiSelect={true}
      favoriteIds={favoriteIds}
      onToggleFavorite={toggleFavorite}
      emptyMessage={t("noReleasePipelinesFound")}
    />
  );
}
