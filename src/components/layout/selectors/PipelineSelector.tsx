"use client";

import { useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { SelectionSheet, SelectionItem } from "@/components/ui/SelectionSheet";
import { usePipelineDefStore, usePipelineFavStore } from "@/lib/stores/selectionStore";
import { Pipeline } from "@/types";
import { selectionLabel } from "@/lib/utils/selectionLabel";

/** Props fuer den Pipeline-Selektor. */
interface Props {
  // Pipeline-Definitionen werden von der Pipelines-Seite uebergeben
  pipelines: Pipeline[];
  loading?: boolean;
}

/**
 * Pipeline-Selector im AppBar: erlaubt Mehrfachauswahl von Pipeline-Definitionen mit Favoriten.
 * Die Auswahl wird im selectionStore persistiert und von der Pipelines-Seite genutzt.
 */
// Pipeline-Selektor: Mehrfachauswahl von Pipeline-Definitionen mit Favoriten
export function PipelineSelector({ pipelines, loading }: Props) {
  const { selectedIds, toggle, clear, load } = usePipelineDefStore();
  const { favoriteIds, toggleFavorite, load: loadFavs } = usePipelineFavStore();
  const t = useTranslations("selectors");

  // Gespeicherte Auswahl und Favoriten beim ersten Mount laden
  useEffect(() => { load(); loadFavs(); }, [load, loadFavs]);

  const items: SelectionItem[] = pipelines.map((p) => ({
    id: String(p.id),
    label: p.name,
    sublabel: p.folder && p.folder !== "\\" ? p.folder : undefined,
  }));

  const buttonLabel = selectionLabel(
    selectedIds,
    t("allPipelines"),
    pipelines.find((p) => String(p.id) === selectedIds[0])?.name,
    t("multiplePipelines", { count: selectedIds.length }),
  );

  return (
    <SelectionSheet
      buttonLabel={buttonLabel}
      buttonIcon={<PlayCircle size={13} className="text-green-400" />}
      sheetTitle={t("pipelinesSheet")}
      items={items}
      loading={loading}
      selectedIds={selectedIds}
      onToggle={toggle}
      onClear={clear}
      multiSelect={true}
      favoriteIds={favoriteIds}
      onToggleFavorite={toggleFavorite}
      emptyMessage={t("noPipelinesFound")}
    />
  );
}
