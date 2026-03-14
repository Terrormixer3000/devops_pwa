import { formatDistanceToNow } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { settingsService } from "@/lib/services/settingsService";

/** Formatiert ein Datum als relative Zeitangabe entsprechend der App-Sprache. */
export function timeAgo(date: string | Date): string {
  const locale = settingsService.load()?.locale ?? "de";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: locale === "en" ? enUS : de });
}
