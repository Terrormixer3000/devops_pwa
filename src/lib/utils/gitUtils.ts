import type { GitChangeEntry } from "@/lib/services/repositoriesService";

/** Entfernt das `refs/heads/`-Praefix von einer Branch-Referenz. */
export function stripRefPrefix(ref: string): string {
  return ref.replace("refs/heads/", "");
}

/** Erstellt einen eindeutigen Schluessel fuer einen Datei-Aenderungseintrag im Diff. */
export function getChangeKey(entry: GitChangeEntry): string {
  return `${entry.changeType}::${entry.originalPath || ""}::${entry.item.path}`;
}
