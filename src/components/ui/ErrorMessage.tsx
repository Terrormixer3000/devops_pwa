"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { extractErrorMessage } from "@/lib/utils/errorUtils";

/** Props fuer die Fehlerdarstellung. */
interface Props {
  message: string;
  /** Optionaler Fehler – wird automatisch in eine lesbare Meldung umgewandelt und ersetzt `message`. */
  error?: unknown;
  onRetry?: () => void;
}

/** Zeigt eine Fehlermeldung mit optionalem Retry-Button an. */
export function ErrorMessage({ message, error, onRetry }: Props) {
  const t = useTranslations("common");
  const displayMessage = error !== undefined ? extractErrorMessage(error, message) : message;
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-slate-300">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {t("retry")}
        </button>
      )}
    </div>
  );
}
