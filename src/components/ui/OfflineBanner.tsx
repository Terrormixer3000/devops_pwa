"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Zeigt einen Amber-Banner oben wenn der Browser offline ist.
 * Schiebt die AppBar nach unten statt sie zu überlagern (via --offline-banner-height).
 */
export function OfflineBanner() {
  const t = useTranslations("offline");
  const bannerRef = useRef<HTMLDivElement>(null);

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el || !isOffline) {
      document.documentElement.style.setProperty("--offline-banner-height", "0px");
      return;
    }
    const height = el.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--offline-banner-height", `${height}px`);

    return () => {
      document.documentElement.style.setProperty("--offline-banner-height", "0px");
    };
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 text-amber-950 text-xs font-medium py-1.5 px-4"
    >
      <WifiOff size={12} className="shrink-0" />
      <span>{t("message")}</span>
    </div>
  );
}
