"use client";

import { RotateCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullProgress: number;
}

/** Animierter Spinner-Indikator fuer Pull-to-Refresh. */
export function PullToRefreshIndicator({ isPulling, pullProgress }: PullToRefreshIndicatorProps) {
  if (!isPulling) return null;

  return (
    <div
      className="fixed top-[7rem] left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 shadow-lg transition-all"
      style={{ opacity: pullProgress, transform: `translateX(-50%) scale(${0.6 + pullProgress * 0.4})` }}
    >
      <RotateCw size={16} className="text-blue-400" style={{ transform: `rotate(${pullProgress * 360}deg)` }} />
    </div>
  );
}
