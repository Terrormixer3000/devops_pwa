"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppBar } from "@/components/layout/AppBar";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { createAzureClient } from "@/lib/api/client";
import { identityService, type AzureCurrentUser } from "@/lib/services/identityService";
import { pushService, type PushPermissionState, type PushSupportStatus } from "@/lib/services/pushService";
import {
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  GitPullRequest,
  MessageSquare,
  Rocket,
  Play,
  ChevronRight,
  Loader2,
  Link2,
  Copy,
  Check,
} from "lucide-react";

type TestEventType =
  | "build.failed"
  | "build.succeeded"
  | "pr.reviewer"
  | "pr.comment"
  | "release.approval";

interface TestResult {
  ok: boolean;
  sent?: number;
  total?: number;
  error?: string;
  notification?: { title: string; body: string };
}

interface EventConfig {
  type: TestEventType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const EVENTS: EventConfig[] = [
  {
    type: "build.failed",
    label: "Build fehlgeschlagen",
    description: "CI Pipeline #42 ist fehlgeschlagen",
    icon: <XCircle size={18} />,
    color: "text-red-400",
  },
  {
    type: "build.succeeded",
    label: "Build erfolgreich",
    description: "CI Pipeline #43 abgeschlossen",
    icon: <CheckCircle size={18} />,
    color: "text-green-400",
  },
  {
    type: "pr.reviewer",
    label: "PR Review angefragt",
    description: "Du wurdest als Reviewer hinzugefuegt",
    icon: <GitPullRequest size={18} />,
    color: "text-blue-400",
  },
  {
    type: "pr.comment",
    label: "PR-Kommentar",
    description: "Neuer Kommentar auf deinem PR",
    icon: <MessageSquare size={18} />,
    color: "text-purple-400",
  },
  {
    type: "release.approval",
    label: "Release-Approval",
    description: "Freigabe fuer Production ausstehend",
    icon: <Rocket size={18} />,
    color: "text-amber-400",
  },
];

// Status-Badge fuer eine Subscription
function SubscriptionStatus({
  isSubscribed,
  permission,
  supportStatus,
}: {
  isSubscribed: boolean;
  permission: PushPermissionState;
  supportStatus: PushSupportStatus;
}) {
  if (supportStatus === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-400">
        <BellOff size={12} />
        Nicht unterstuetzt
      </span>
    );
  }
  if (supportStatus === "needs-https" || supportStatus === "needs-pwa-install" || supportStatus === "needs-service-worker") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-400">
        <AlertCircle size={12} />
        Einrichtung noetig
      </span>
    );
  }
  if (permission === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/40 text-red-400">
        <XCircle size={12} />
        Erlaubnis verweigert
      </span>
    );
  }
  if (isSubscribed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/40 text-green-400">
        <CheckCircle size={12} />
        Aktiv
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-400">
      <BellOff size={12} />
      Deaktiviert
    </span>
  );
}

// Ergebnis-Anzeige nach einem Test-Versand
function ResultBanner({ result }: { result: TestResult | null }) {
  if (!result) return null;

  if (result.ok) {
    return (
      <div className="flex items-start gap-3 p-3.5 bg-green-900/25 border border-green-700/40 rounded-xl">
        <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-green-300">
            Notification gesendet ({result.sent}/{result.total})
          </p>
          {result.notification && (
            <p className="text-xs text-green-400/70 mt-0.5 truncate">
              &ldquo;{result.notification.title}&rdquo; — {result.notification.body}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3.5 bg-red-900/25 border border-red-700/40 rounded-xl">
      <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-300">Fehler</p>
        <p className="text-xs text-red-400/70 mt-0.5">{result.error}</p>
      </div>
    </div>
  );
}

// Webhook-URL Anzeige (read-only)
function WebhookUrlReadOnly({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${origin}/api/push/webhook?t=${token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignorieren
    }
  };

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

export default function PushTestPage() {
  const { settings } = useSettingsStore();

  // Push-State
  const [supportStatus, setSupportStatus] = useState<PushSupportStatus>("unsupported");
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AzureCurrentUser | null>(null);

  // Test-State
  const [loadingEvent, setLoadingEvent] = useState<TestEventType | null>(null);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const [lastTestedEvent, setLastTestedEvent] = useState<TestEventType | null>(null);

  const refreshState = useCallback(async () => {
    const status = pushService.getSupportStatus();
    setSupportStatus(status);
    if (status === "supported") {
      setPermission(pushService.getPermissionState());
      try {
        const sub = await pushService.getExistingSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    const stored = pushService.getStoredToken();
    if (stored) setWebhookToken(stored);
  }, []);

  useEffect(() => {
    if (!settings?.organization || !settings?.project || (!settings?.pat && !settings?.demoMode)) {
      setCurrentUser(null);
      return;
    }

    const client = createAzureClient(settings);
    identityService
      .getCurrentUser(client)
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, [settings]);

  // Test-Notification senden
  const handleTest = async (eventType: TestEventType) => {
    if (!settings?.organization || !settings?.project) {
      setLastResult({ ok: false, error: "Bitte zuerst Organisation und Projekt in den Einstellungen konfigurieren." });
      setLastTestedEvent(eventType);
      return;
    }

    if (!currentUser) {
      setLastResult({ ok: false, error: "Azure DevOps Benutzer konnte nicht ermittelt werden." });
      setLastTestedEvent(eventType);
      return;
    }

    setLoadingEvent(eventType);
    setLastResult(null);
    setLastTestedEvent(eventType);

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org: settings.organization,
          project: settings.project,
          azureUserId: currentUser.id,
          eventType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLastResult({ ok: false, error: data.error ?? `HTTP ${res.status}` });
      } else {
        setLastResult(data as TestResult);
      }
    } catch (err) {
      setLastResult({ ok: false, error: err instanceof Error ? err.message : "Netzwerkfehler" });
    } finally {
      setLoadingEvent(null);
    }
  };

  const canTest =
    supportStatus === "supported" &&
    isSubscribed &&
    !!settings?.organization &&
    !!settings?.project &&
    !!currentUser;

  return (
    <div className="min-h-screen">
      <AppBar title="Push-Test" />

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">

        {/* Schritt 1: Status & Subscription */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              1 — Subscription
            </h2>
            <SubscriptionStatus
              isSubscribed={isSubscribed}
              permission={permission}
              supportStatus={supportStatus}
            />
          </div>

          {/* Org/Projekt Info */}
          <div className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Organisation</span>
              <span className="text-slate-300 font-mono">
                {settings?.organization || <span className="text-red-400">nicht gesetzt</span>}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Projekt</span>
              <span className="text-slate-300 font-mono">
                {settings?.project || <span className="text-red-400">nicht gesetzt</span>}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Modus</span>
              <span className={settings?.demoMode ? "text-amber-400" : "text-slate-300"}>
                {settings?.demoMode ? "Demo" : "Live"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-500">Azure User</span>
              <span className="text-slate-300 font-mono text-right truncate">
                {currentUser ? currentUser.displayName : <span className="text-amber-400">wird geladen</span>}
              </span>
            </div>
            {currentUser && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-500">User ID</span>
                <span className="text-slate-300 font-mono text-right truncate">{currentUser.id}</span>
              </div>
            )}
          </div>

          {/* Kontext-Banner je nach Support-Status */}
          {supportStatus === "unsupported" && (
            <div className="flex items-start gap-2.5 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
              <BellOff size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                Dieser Browser unterstuetzt Web Push nicht. Bitte Chrome, Edge, Firefox oder Safari (als installierte PWA auf iOS 16.4+) verwenden.
              </p>
            </div>
          )}

          {supportStatus === "needs-https" && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-300">HTTPS erforderlich</p>
                <p className="text-xs text-amber-400/80">
                  Web Push erfordert HTTPS. Dev-Server mit{" "}
                  <span className="font-mono text-amber-300">npm run dev</span>{" "}
                  starten (beinhaltet <span className="font-mono text-amber-300">--experimental-https</span>),
                  dann das Zertifikat auf dem iPhone unter Einstellungen → Allgemein → VPN &amp; Geraeteverwaltung vertrauen.
                </p>
              </div>
            </div>
          )}

          {supportStatus === "needs-pwa-install" && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-300">PWA-Installation erforderlich</p>
                <p className="text-xs text-amber-400/80">
                  Auf iOS funktioniert Web Push nur in der installierten App. Safari-Menü → &quot;Zum Home-Bildschirm hinzufuegen&quot; (iOS 16.4+).
                </p>
              </div>
            </div>
          )}

          {supportStatus === "needs-service-worker" && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-300">Service Worker nicht aktiv</p>
                <p className="text-xs text-amber-400/80">
                  In dieser Umgebung ist kein Push-faehiger Service Worker aktiv.
                  Bitte <span className="font-mono text-amber-300">/sw.js</span> pruefen, Hard-Reload ausfuehren
                  und bei Bedarf alte Service Worker im Browser entfernen.
                </p>
              </div>
            </div>
          )}

          {/* Kein Settings-Hinweis */}
          {supportStatus === "supported" && (!settings?.organization || !settings?.project) && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Organisation und Projekt muessen in den Einstellungen konfiguriert sein.
              </p>
            </div>
          )}

          {/* CTA: Nicht abonniert → Wizard */}
          {supportStatus === "supported" && !isSubscribed && permission !== "denied" && (
            <Link
              href="/push-setup"
              className="flex items-center justify-between gap-3 w-full rounded-xl border border-blue-700/40 bg-blue-900/15 p-3.5 text-left transition-colors hover:bg-blue-900/25"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-blue-300">Notifications noch nicht eingerichtet</p>
                <p className="text-xs text-blue-400/70">Zum Einrichtungs-Wizard wechseln</p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 text-blue-400" />
            </Link>
          )}

          {/* Webhook-URL (read-only) */}
          {isSubscribed && webhookToken && (
            <WebhookUrlReadOnly token={webhookToken} />
          )}

          {permission === "denied" && (
            <div className="flex items-start gap-2.5 p-3 bg-red-900/20 border border-red-700/40 rounded-xl">
              <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Notifications wurden blockiert. Bitte in den Browser-Einstellungen wieder erlauben.
              </p>
            </div>
          )}
        </section>

        <div className="border-t border-slate-700/50" />

        {/* Schritt 2: Events testen */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            2 — Event simulieren
          </h2>

          {!canTest && (
            <div className="flex items-start gap-2.5 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <AlertCircle size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Notifications muessen zuerst aktiviert sein um Events zu testen.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {EVENTS.map((event) => {
              const isLoading = loadingEvent === event.type;
              const wasLast = lastTestedEvent === event.type;

              return (
                <button
                  key={event.type}
                  onClick={() => handleTest(event.type)}
                  disabled={!canTest || loadingEvent !== null}
                  className="w-full flex items-center gap-3 p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-left transition-colors hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  <span className={`flex-shrink-0 ${event.color}`}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : event.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{event.label}</p>
                    <p className="text-xs text-slate-500 truncate">{event.description}</p>
                  </div>
                  {wasLast && lastResult && !isLoading && (
                    <span className="flex-shrink-0">
                      {lastResult.ok
                        ? <CheckCircle size={16} className="text-green-400" />
                        : <XCircle size={16} className="text-red-400" />
                      }
                    </span>
                  )}
                  {!isLoading && (
                    <Play size={14} className="flex-shrink-0 text-slate-600" />
                  )}
                  <ChevronRight size={14} className="flex-shrink-0 text-slate-600" />
                </button>
              );
            })}
          </div>

          {/* Letztes Ergebnis */}
          {lastResult && <ResultBanner result={lastResult} />}
        </section>

        <div className="border-t border-slate-700/50" />

        {/* Info: Wie der Test funktioniert */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Wie es funktioniert
          </h2>
          <div className="p-4 bg-slate-800/30 rounded-xl space-y-3 text-xs text-slate-500">
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">1</span>
              <p>Notifications aktivieren → Browser fragt nach Erlaubnis → Subscription wird auf dem Server gespeichert</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">2</span>
              <p>Event-Button antippen → Server sendet eine echte Web Push Notification ueber den VAPID-Schluessel</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">3</span>
              <p>Notification erscheint — auch wenn die App im Hintergrund oder geschlossen ist (nur bei installierter PWA auf iOS)</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">4</span>
              <p>Im echten Betrieb ersetzt Azure DevOps Schritt 2 — Service Hooks senden Events automatisch an <span className="font-mono text-slate-400">/api/push/webhook</span></p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
