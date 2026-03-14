"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface WebhookUrlBoxProps {
  token: string;
  /** Kompakte Darstellung ohne erklaerenden Text. */
  compact?: boolean;
}

/**
 * Zeigt eine Webhook-URL mit Kopier-Schaltflaeche an.
 * Wird auf push-setup und push-test Seiten verwendet.
 */
export function WebhookUrlBox({ token, compact = false }: WebhookUrlBoxProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("webhookBox");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${origin}/api/push/webhook?t=${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignorieren
    }
  };

  if (compact) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link2 size={13} className="flex-shrink-0" />
          <span className="font-medium">{t("urlTitle")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400">{webhookUrl}</span>
          <button
            onClick={handleCopy}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-600"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? t("ok") : t("copy")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        {t("configHint", { path: t("configPath") })}
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-slate-600/60 bg-slate-900/60 p-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">{webhookUrl}</span>
        <button
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-600 active:scale-95"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {t("eventTypes")}{" "}
        <span className="text-slate-400">{t("eventList")}</span>
      </p>
    </div>
  );
}
