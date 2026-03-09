import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

/** Formatiert ein Datum als relative Zeitangabe auf Deutsch (z.B. "vor 3 Stunden"). */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de });
}
