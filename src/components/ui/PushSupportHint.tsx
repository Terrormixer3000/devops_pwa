"use client";

import { AlertCircle, BellOff } from "lucide-react";
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
  if (compact) {
    if (status === "supported") {
      return <p className="text-xs text-green-300/90">Browser und Service Worker sind bereit fuer Push.</p>;
    }
    if (status === "needs-https") {
      return (
        <p className="text-xs text-amber-300/90">
          HTTPS erforderlich. Bitte ueber{" "}
          <span className="font-mono">https://localhost:3000</span> öffnen.
        </p>
      );
    }
    if (status === "needs-pwa-install") {
      return (
        <p className="text-xs text-amber-300/90">
          Auf iOS sind Push-Nachrichten nur in der installierten PWA verfügbar
          (&quot;Zum Home-Bildschirm hinzufügen&quot;).
        </p>
      );
    }
    if (status === "needs-service-worker") {
      return (
        <p className="text-xs text-amber-300/90">
          Kein aktiver Service Worker. Bitte{" "}
          <span className="font-mono">/sw.js</span> prüfen und Seite hart neu laden.
        </p>
      );
    }
    return <p className="text-xs text-slate-400">Dieser Browser unterstuetzt Push nicht.</p>;
  }

  // Expanded-Darstellung (fuer Settings/Push-Test)
  if (status === "unsupported") {
    return (
      <div className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <BellOff size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-400">Nicht unterstuetzt</p>
          <p className="text-xs text-slate-500">
            Dieser Browser unterstützt keine Push-Benachrichtigungen.
          </p>
        </div>
      </div>
    );
  }

  if (status === "needs-https") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-300">HTTPS erforderlich</p>
          <p className="text-xs text-amber-400/80">
            Web Push erfordert HTTPS. Dev-Server mit{" "}
            <span className="font-mono">npm run dev</span> starten, dann das Zertifikat auf dem iPhone unter
            Einstellungen → Allgemein → VPN &amp; Geraeteverwaltung vertrauen.
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
          <p className="text-sm font-medium text-amber-300">PWA-Installation erforderlich</p>
          <p className="text-xs text-amber-400/80">
            Push-Benachrichtigungen funktionieren nur wenn die App ueber &quot;Zum Home-Bildschirm
            hinzufügen&quot; installiert wurde (ab iOS 16.4).
          </p>
        </div>
      </div>
    );
  }

  if (status === "needs-service-worker") {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-300">Service Worker nicht aktiv</p>
          <p className="text-xs text-amber-400/80">
            In der aktuellen Umgebung ist kein Push-faehiger Service Worker aktiv.
            Bitte <span className="font-mono">/sw.js</span> prüfen, Hard-Reload ausführen
            und falls nötig den Browser-Cache bzw. alte Service Worker entfernen.
          </p>
        </div>
      </div>
    );
  }

  // supported — show nothing in expanded mode (handled by caller)
  return null;
}
