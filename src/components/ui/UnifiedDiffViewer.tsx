"use client";

import { useMemo } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { buildUnifiedDiff } from "@/lib/utils/unifiedDiff";

/** Props fuer den Unified-Diff-Viewer. */
interface Props {
  title: string;
  oldContent: string;
  newContent: string;
  oldLabel: string;
  newLabel: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

/**
 * Stellt einen Unified-Diff zweier Texte als Zeilen-Tabelle dar.
 * Hinzugefuegte Zeilen werden gruen, geloeschte rot markiert.
 * Zaehlt Hinzufuegungen und Loeschungen und zeigt sie im Header an.
 */
export function UnifiedDiffViewer({
  title,
  oldContent,
  newContent,
  oldLabel,
  newLabel,
  loading = false,
  error,
  emptyMessage = "Keine Diff-Aenderungen gefunden",
}: Props) {
  const rows = useMemo(() => buildUnifiedDiff(oldContent, newContent), [oldContent, newContent]);
  const additions = rows.filter((row) => row.origin === "add").length;
  const deletions = rows.filter((row) => row.origin === "delete").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70">
      <div className="border-b border-slate-800/80 px-3 py-2.5">
        <p className="truncate text-xs font-mono text-slate-300">{title}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
          <span>{oldLabel}</span>
          <span>→</span>
          <span>{newLabel}</span>
          <span className="ml-auto text-green-400">+{additions}</span>
          <span className="text-red-400">-{deletions}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="max-h-[52vh] overflow-auto">
          <table className="w-full text-xs font-mono">
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${index}-${row.origin}`}
                  className={
                    row.origin === "add"
                      ? "diff-add"
                      : row.origin === "delete"
                      ? "diff-delete"
                      : "hover:bg-slate-800/30"
                  }
                >
                  <td
                    className={`select-none border-r border-slate-800 px-2 py-0.5 text-right text-slate-600 min-w-[44px] w-[44px] ${
                      row.origin === "add" ? "diff-add-line-num" : row.origin === "delete" ? "diff-delete-line-num" : ""
                    }`}
                  >
                    {row.oldLineNumber ?? ""}
                  </td>
                  <td
                    className={`select-none border-r border-slate-800 px-2 py-0.5 text-right text-slate-600 min-w-[44px] w-[44px] ${
                      row.origin === "add" ? "diff-add-line-num" : row.origin === "delete" ? "diff-delete-line-num" : ""
                    }`}
                  >
                    {row.newLineNumber ?? ""}
                  </td>
                  <td className="px-3 py-0.5 whitespace-pre text-slate-300">
                    {row.origin === "add" ? "+ " : row.origin === "delete" ? "- " : "  "}
                    {row.line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
