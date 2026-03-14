"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Zeigt einen nicht-invasiven Banner wenn der Browser offline ist.
 * Verschwindet automatisch sobald die Verbindung wiederhergestellt wird.
 */
export function OfflineBanner() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const t = useTranslations("offline");
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" && !isDevelopment ? !navigator.onLine : false
  );

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

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/95 text-amber-950 text-xs font-medium py-1.5 px-4 safe-area-top"
    >
      <WifiOff size={12} className="flex-shrink-0" />
      <span>{t("message")}</span>
    </div>
  );
}
