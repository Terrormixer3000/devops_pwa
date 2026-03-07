"use client";

import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => unknown;
  /** Mindest-Zugabstand in px bis Refresh ausgeloest wird. Standard: 80 */
  threshold?: number;
  /** Nur ausfuehren wenn Seite ganz oben scrollt. Standard: true */
  requireScrollTop?: boolean;
  isRefreshing?: boolean;
}

/**
 * Pull-to-Refresh Hook fuer Touch-Geraete.
 * Gibt `pullProgress` (0..1) zurueck, um einen visuellen Ladeindikator darzustellen.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  requireScrollTop = true,
  isRefreshing = false,
}: UsePullToRefreshOptions) {
  const startYRef = useRef<number | null>(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    const el = document.documentElement;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      if (requireScrollTop && scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullProgress(0);
        setIsPulling(false);
        return;
      }
      setIsPulling(true);
      setPullProgress(Math.min(delta / threshold, 1));
    };

    const handleTouchEnd = async () => {
      if (startYRef.current === null) return;
      if (isPulling && pullProgress >= 1) {
        await onRefresh();
      }
      startYRef.current = null;
      setIsPulling(false);
      setPullProgress(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, threshold, requireScrollTop, isRefreshing, isPulling, pullProgress]);

  return { pullProgress, isPulling };
}
