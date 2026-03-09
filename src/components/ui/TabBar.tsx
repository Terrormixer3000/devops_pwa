"use client";

import { type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string | ReactNode;
  icon?: ReactNode;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "pill" | "underline";
  className?: string;
}

/**
 * Wiederverwendbare Tab-Leiste in zwei Varianten:
 * - "pill" (Standard): Runde Pill-Buttons, fest unter der AppBar positioniert (fuer Listen-Seiten)
 * - "underline": Unterstrichene Tabs, sticky (fuer Detail-Seiten)
 */
export function TabBar({ tabs, activeKey, onChange, variant = "pill", className }: TabBarProps) {
  if (variant === "underline") {
    return (
      <div className={`${className ?? "sticky-below-appbar"} bg-slate-900/95 backdrop-blur-md border-b border-slate-800`}>
        <div className="flex px-4">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeKey === key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // pill variant (default)
  return (
    <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
      <div className="flex gap-1 overflow-x-auto hide-scrollbar">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeKey === key
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
