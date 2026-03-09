/** Kleiner Farbpunkt für den Änderungstyp einer Datei (Add/Edit/Delete). */
export function ChangeTypeDot({ type }: { type: string }) {
  const map: Record<string, { color: string; label: string }> = {
    add: { color: "text-green-400", label: "A" },
    edit: { color: "text-blue-400", label: "M" },
    delete: { color: "text-red-400", label: "D" },
    rename: { color: "text-yellow-400", label: "R" },
  };
  const info = map[type?.toLowerCase()] || { color: "text-slate-400", label: "?" };
  return <span className={`text-xs font-bold font-mono ${info.color} flex-shrink-0`}>{info.label}</span>;
}
