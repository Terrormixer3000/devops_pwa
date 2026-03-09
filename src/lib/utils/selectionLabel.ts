/**
 * Erzeugt ein zusammenfassendes Label fuer eine Selektor-Auswahl.
 *
 * @param selectedIds - aktuell ausgewaehlte IDs
 * @param allLabel - Label wenn nichts ausgewaehlt ist (z.B. "Alle Repos")
 * @param singleName - Name des einzelnen ausgewaehlten Elements (oder Fallback)
 * @param pluralLabel - z.B. "3 Repos"
 */
export function selectionLabel(
  selectedIds: string[],
  allLabel: string,
  singleName: string | undefined,
  pluralLabel: string,
): string {
  if (selectedIds.length === 0) return allLabel;
  if (selectedIds.length === 1) return singleName ?? "1 Element";
  return pluralLabel;
}
