"use client";

import { RotateCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullProgress: number;
  /** Wird auf true gesetzt sobald der Refresh-Request laeuft. */
  isRefreshing?: boolean;
}

/** Animierter Spinner-Indikator fuer Pull-to-Refresh. */
export function PullToRefreshIndicator({ isPulling, pullProgress, isRefreshing }: PullToRefreshIndicatorProps) {
  const visible = isPulling || isRefreshing;
  if (!visible) return null;

  const progress = isRefreshing ? 1 : pullProgress;

  return (
    <div
      className="fixed left-1/2 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 shadow-lg"
      style={{
        top: "calc(var(--app-bar-height) + 4rem)",
        opacity: progress,
        transform: `translateX(-50%) scale(${0.6 + progress * 0.4})`,
        transition: isRefreshing ? "opacity 0.2s, transform 0.2s" : "none",
      }}
    >
      <RotateCw
        size={16}
        className={`text-blue-400 ${isRefreshing ? "animate-spin" : ""}`}
        style={!isRefreshing ? { transform: `rotate(${pullProgress * 360}deg)` } : undefined}
      />
    </div>
  );
}
