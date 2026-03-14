"use client";

import { AlertCircle, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PushSupportStatus } from "@/lib/services/pushService";

interface PushSupportHintProps {
  status: PushSupportStatus;
  /** Kompakte einzeilige Darstellung (fuer Wizard-Steps). */
  compact?: boolean;
}

/**
 * Hinweistext zum Browser-/Geraete-Support fuer Push-Benachrichtigungen.
 * Wird auf settings, push-setup und push-test Seiten verwendet.
 */
export function PushSupportHint({ status, compact = false }: PushSupportHintProps) {
  const t = useTranslations("pushSupport");

  if (compact) {
    if (status === "supported") {
      return <p className="text-xs text-green-300/90">{t("ready")}</p>;
    }
    if (status === "needs-https") {
      return (
        <p className="text-xs text-amber-300/90">
          {t("needsHttps", { url: "https://localhost:3000" })}
        </p>
      );
    }
    if (status === "needs-pwa-install") {
      return (
        <p className="text-xs text-amber-300/90">
          {t("needsPwaInstall")}
        </p>
      );
    }
    if (status === "needs-service-worker") {
      return (
        <p className="text-xs text-amber-300/90">
          {t("needsServiceWorker", { path: "/sw.js" })}
        </p>
      );
    }
    return <p className="text-xs text-slate-400">{t("unsupported")}</p>;
  }

  // Expanded-Darstellung (fuer Settings/Push-Test)
  if (status === "unsupported") {
    return (
      <div className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <BellOff size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-400">{t("unsupportedTitle")}</p>
          <p className="text-xs text-slate-500">{t("unsupportedDesc")}</p>
        </div>
      </div>
    );
  }

  if (status === "needs-https") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-300">{t("httpsTitle")}</p>
          <p className="text-xs text-amber-400/80">
            {t("httpsDesc", { cmd: "npm run dev" })}
          </p>
        </div>
      </div>
    );
  }

  if (status === "needs-pwa-install") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-300">{t("pwaInstallTitle")}</p>
          <p className="text-xs text-amber-400/80">{t("pwaInstallDesc")}</p>
        </div>
      </div>
    );
  }

  if (status === "needs-service-worker") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-300">{t("swTitle")}</p>
          <p className="text-xs text-amber-400/80">
            {t("swDesc", { path: "/sw.js" })}
          </p>
        </div>
      </div>
    );
  }

  // supported — show nothing in expanded mode (handled by caller)
  return null;
}
