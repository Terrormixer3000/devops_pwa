"use client";

import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";

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
          <span className="font-medium">Deine Webhook-URL</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-400">{webhookUrl}</span>
          <button
            onClick={handleCopy}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-600"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? "OK" : "Kopieren"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Trage diese URL in Azure DevOps unter{" "}
        <span className="text-slate-300">Projekteinstellungen → Service Hooks → Web Hooks</span>{" "}
        ein. Die URL authentifiziert Webhooks fuer deinen Account.
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-slate-600/60 bg-slate-900/60 p-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">{webhookUrl}</span>
        <button
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-600 active:scale-95"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Konfiguriere in Azure DevOps folgende Event-Typen:{" "}
        <span className="text-slate-400">
          Build completed · Pull request reviewer(s) updated · Pull request commented on · Release deployment approval pending
        </span>
      </p>
    </div>
  );
}
