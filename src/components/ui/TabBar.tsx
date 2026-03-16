"use client";

import { type ReactNode } from "react";

/** Einzelner Tab-Eintrag für die `TabBar`-Komponente. */
export interface TabItem {
  key: string;
  label: string | ReactNode;
  icon?: ReactNode;
}

/** Props der `TabBar`-Komponente. */
interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "pill" | "underline" | "segment";
  className?: string;
}

/**
 * Wiederverwendbare Tab-Leiste in zwei Varianten:
 * - "pill" (Standard): Runde Pill-Buttons, fest unter der AppBar positioniert (fuer Listen-Seiten)
 * - "underline": Unterstrichene Tabs, sticky (fuer Detail-Seiten)
 */
export function TabBar({ tabs, activeKey, onChange, variant = "pill", className }: TabBarProps) {
  if (variant === "segment") {
    return (
      <div className={`${className ?? "sticky-below-appbar"} bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-3 py-2 [html[data-theme='light']_&]:border-slate-300`}>
        <div className="grid p-1 rounded-2xl bg-slate-800/60" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium transition-all ${
                activeKey === key
                  ? "bg-slate-700 text-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {icon}
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "underline") {
    return (
      <div className={`${className ?? "sticky-below-appbar"} overflow-x-hidden bg-slate-900/95 border-b border-slate-800 backdrop-blur-md [html[data-theme='light']_&]:border-slate-300`}>
        <div className="overflow-x-auto hide-scrollbar">
          <div className="flex min-w-full w-max px-4">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => onChange(key)}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeKey === key
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 [html[data-theme='light']_&]:hover:text-slate-600"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // pill variant (default)
  return (
    <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2 [html[data-theme='light']_&]:border-slate-300">
      <div className="flex gap-1 overflow-x-auto hide-scrollbar">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeKey === key
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200 [html[data-theme='light']_&]:hover:text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
