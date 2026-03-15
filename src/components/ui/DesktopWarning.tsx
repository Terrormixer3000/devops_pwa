"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { useTranslations } from "next-intl";

// Ab dieser Breite (px) gilt das Gerät als nicht-mobil
const MOBILE_BREAKPOINT = 768;

function subscribeToResize(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

/**
 * Bottom-Toast-Hinweis wenn die App auf einem Tablet oder Desktop geöffnet wird.
 * Bleibt sichtbar bis der User ihn manuell schließt.
 */
export function DesktopWarning() {
  const t = useTranslations("desktopWarning");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // useSyncExternalStore: Server-Snapshot gibt false zurück → kein Hydration-Mismatch
  const isWideScreen = useSyncExternalStore(
    subscribeToResize,
    () => window.innerWidth >= MOBILE_BREAKPOINT,
    () => false
  );

  useEffect(() => {
    if (isWideScreen) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isWideScreen]);

  if (!isWideScreen || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-60 flex items-start gap-3
        bg-slate-700 border border-slate-500
        text-slate-100 rounded-2xl shadow-2xl
        px-4 py-3 max-w-sm w-[calc(100%-2rem)]
        transition-all duration-500 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
    >
      <div className="mt-0.5 shrink-0 bg-blue-500/20 rounded-full p-1.5">
        <Smartphone size={16} className="text-blue-400" />
      </div>
      <p className="text-xs leading-relaxed text-slate-200 flex-1">
        {t("message")}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="shrink-0 mt-0.5 text-slate-400 hover:text-slate-100 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
