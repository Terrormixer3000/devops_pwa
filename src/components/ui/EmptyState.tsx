"use client";

import { LucideIcon } from "lucide-react";

/** Leerzustand-Platzhalter mit Icon, Titel, Beschreibung und optionaler Aktion. */
interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Zeigt einen leeren Zustand mit zentriertem Icon und Text an. */
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <Icon className="w-12 h-12 text-slate-600" />
      <div>
        <p className="text-base font-medium text-slate-300">{title}</p>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
