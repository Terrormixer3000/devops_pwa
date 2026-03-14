import type { Locale } from "@/types";
import de from "./de.json";
import en from "./en.json";

export const messages: Record<Locale, typeof de> = { de, en };

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "de";
  return navigator.language.startsWith("en") ? "en" : "de";
}

export type { Locale };
