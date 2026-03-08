"use client";

/**
 * Push-Einrichtungs-Wizard: Fuehrt den Nutzer in 5 Schritten durch die Einrichtung
 * von Web-Push-Benachrichtigungen (VAPID-Schluessel, Service Worker, Webhook-URL).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Bell,
  BellOff,
  UserRound,
  Send,
  ShieldCheck,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { AppBar } from "@/components/layout/AppBar";
import { BackLink } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createAzureClient } from "@/lib/api/client";
import { identityService, type AzureCurrentUser } from "@/lib/services/identityService";
import { pushService, type PushPermissionState, type PushSupportStatus } from "@/lib/services/pushService";
import { useSettingsStore } from "@/lib/stores/settingsStore";

type StepStatus = "done" | "active" | "blocked";

interface TestResult {
  ok: boolean;
  sent?: number;
  total?: number;
  error?: string;
}

/** Badge fuer einen Wizard-Schritt mit Statusanzeige (pending/active/done/error). */
function StepBadge({ label, status }: { label: string; status: StepStatus }) {
  if (status === "done") return <Badge variant="success">{label}</Badge>;
  if (status === "active") return <Badge variant="info">{label}</Badge>;
  return <Badge variant="muted">{label}</Badge>;
}

/** Hinweistext zum Browser-/Geraete-Support fuer Push-Benachrichtigungen. */
function SupportHint({ status }: { status: PushSupportStatus }) {
  if (status === "supported") {
    return <p className="text-xs text-green-300/90">Browser und Service Worker sind bereit fuer Push.</p>;
  }
  if (status === "needs-https") {
    return (
      <p className="text-xs text-amber-300/90">
        HTTPS erforderlich. Bitte ueber{" "}
        <span className="font-mono">https://localhost:3000</span> oeffnen.
      </p>
    );
  }
  if (status === "needs-pwa-install") {
    return (
      <p className="text-xs text-amber-300/90">
        Auf iOS sind Push-Nachrichten nur in der installierten PWA verfuegbar
        (&quot;Zum Home-Bildschirm hinzufuegen&quot;).
      </p>
    );
  }
  if (status === "needs-service-worker") {
    return (
      <p className="text-xs text-amber-300/90">
        Kein aktiver Service Worker. Bitte{" "}
        <span className="font-mono">/sw.js</span> pruefen und Seite hart neu laden.
      </p>
    );
  }
  return <p className="text-xs text-slate-400">Dieser Browser unterstuetzt Push nicht.</p>;
}

async function readJsonOrFallback(response: Response): Promise<{ error?: string }> {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return { error: `HTTP ${response.status}` };
  }
}

/** Karten-Komponente fuer einen einzelnen Wizard-Schritt. */
function StepCard({
  number,
  title,
  status,
  children,
}: {
  number: number;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
}) {
  const borderColor =
    status === "done"
      ? "border-green-700/40"
      : status === "active"
        ? "border-blue-600/50"
        : "border-slate-700/40";

  return (
    <section className={`space-y-3 rounded-2xl border ${borderColor} bg-slate-800/40 p-4`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            status === "done"
              ? "bg-green-700/50 text-green-300"
              : status === "active"
                ? "bg-blue-700/50 text-blue-200"
                : "bg-slate-700/50 text-slate-500"
          }`}
        >
          {status === "done" ? <CheckCircle size={14} /> : number}
        </span>
        <h3
          className={`text-sm font-semibold ${
            status === "blocked" ? "text-slate-500" : "text-slate-200"
          }`}
        >
          {title}
        </h3>
      </div>
      {status !== "blocked" && <div className="space-y-3">{children}</div>}
      {status === "blocked" && (
        <p className="text-xs text-slate-600">Vorherige Schritte zuerst abschliessen.</p>
      )}
    </section>
  );
}

/** Zeigt die generierte Webhook-URL mit Kopier-Schaltflaeche an. */
function WebhookUrlBox({ token }: { token: string }) {
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

/** 5-Schritte-Wizard zur Ersteinrichtung von Push-Benachrichtigungen. */
export default function PushSetupPage() {
  const { settings } = useSettingsStore();

  const [supportStatus, setSupportStatus] = useState<PushSupportStatus>("unsupported");
  const [permissionState, setPermissionState] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<AzureCurrentUser | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const organization = settings?.organization ?? "";
  const project = settings?.project ?? "";
  const hasProjectScope = !!organization && !!project;
  const hasCredentials = !!settings?.demoMode || !!settings?.pat;

  const refreshPushState = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = pushService.getSupportStatus();
      setSupportStatus(status);
      setPermissionState(pushService.getPermissionState());

      if (status !== "supported") {
        setIsSubscribed(false);
        return;
      }

      try {
        const existing = await pushService.getExistingSubscription();
        setIsSubscribed(!!existing);
      } catch {
        setIsSubscribed(false);
      }
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    if (!settings || !hasProjectScope || !hasCredentials) {
      setCurrentUser(null);
      return;
    }

    setIdentityLoading(true);
    try {
      const client = createAzureClient(settings);
      const user = await identityService.getCurrentUser(client);
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setIdentityLoading(false);
    }
  }, [hasCredentials, hasProjectScope, settings]);

  // Push-Status laden
  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  // Azure User laden
  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // Gespeicherten Token aus localStorage lesen
  useEffect(() => {
    const stored = pushService.getStoredToken();
    if (stored) setWebhookToken(stored);
  }, []);

  const canResolveIdentity = hasProjectScope && hasCredentials;
  const canSubscribe =
    supportStatus === "supported" &&
    permissionState !== "denied" &&
    !!currentUser &&
    hasProjectScope;
  const canSendTest = isSubscribed && !!currentUser && hasProjectScope;

  const prerequisitesDone = supportStatus === "supported" && hasProjectScope;
  const identityDone = !!currentUser;
  const subscriptionDone = isSubscribed;
  const webhookDone = !!webhookToken;
  const testDone = !!testResult?.ok;

  const stepStatuses = useMemo(
    (): StepStatus[] => [
      prerequisitesDone ? "done" : "active",
      identityDone ? "done" : prerequisitesDone ? "active" : "blocked",
      subscriptionDone ? "done" : identityDone ? "active" : "blocked",
      webhookDone ? "done" : subscriptionDone ? "active" : "blocked",
      testDone ? "done" : webhookDone ? "active" : "blocked",
    ],
    [identityDone, prerequisitesDone, subscriptionDone, testDone, webhookDone]
  );

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    setErrorMessage("");
    setTestResult(null);

    try {
      if (!currentUser) throw new Error("Azure User konnte nicht geladen werden.");
      if (!organization || !project) throw new Error("Organisation und Projekt muessen gesetzt sein.");

      const subscription = await pushService.subscribe();
      const { webhookToken: token } = await pushService.registerSubscription(
        subscription,
        organization,
        project,
        currentUser.id,
        currentUser.displayName
      );

      pushService.storeToken(token);
      setWebhookToken(token);
      await refreshPushState();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Aktivierung fehlgeschlagen");
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubscribeLoading(true);
    setErrorMessage("");
    setTestResult(null);

    try {
      await pushService.unsubscribe();
      setWebhookToken(null);
      await refreshPushState();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Deaktivierung fehlgeschlagen");
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!organization || !project || !currentUser) {
      setErrorMessage("Organisation, Projekt und Azure User sind erforderlich.");
      return;
    }

    setTestLoading(true);
    setErrorMessage("");
    setTestResult(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org: organization,
          project,
          azureUserId: currentUser.id,
          eventType: "build.failed",
        }),
      });

      const data = await readJsonOrFallback(response);
      if (!response.ok) {
        setTestResult({ ok: false, error: data.error ?? `HTTP ${response.status}` });
        return;
      }

      setTestResult(data as TestResult);
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : "Netzwerkfehler" });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppBar title="Push-Einrichtung" />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <BackLink href="/settings" className="mb-1" />

        {/* Header + Fortschritts-Badges */}
        <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Push-Einrichtung
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Richte Push-Notifications fuer Azure DevOps Events ein. Folge den Schritten der Reihe nach.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["Voraussetzungen", "User", "Aktivieren", "Webhook-URL", "Test"] as const).map(
              (label, i) => (
                <StepBadge key={label} label={`${i + 1} ${label}`} status={stepStatuses[i]} />
              )
            )}
          </div>
        </div>

        {/* Schritt 1 — Voraussetzungen */}
        <StepCard number={1} title="Voraussetzungen pruefen" status={stepStatuses[0]}>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Organisation</span>
              {organization ? (
                <span className="font-mono text-slate-300">{organization}</span>
              ) : (
                <span className="text-amber-400">nicht gesetzt</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Projekt</span>
              {project ? (
                <span className="font-mono text-slate-300">{project}</span>
              ) : (
                <span className="text-amber-400">nicht gesetzt</span>
              )}
            </div>
          </div>
          <SupportHint status={supportStatus} />
          {!hasProjectScope && (
            <p className="text-xs text-slate-500">
              Bitte Organisation und Projekt in den{" "}
              <span className="text-blue-400">Einstellungen</span> konfigurieren.
            </p>
          )}
          <Button variant="secondary" onClick={refreshPushState} loading={statusLoading}>
            Status neu pruefen
          </Button>
        </StepCard>

        {/* Schritt 2 — Azure User */}
        <StepCard number={2} title="Azure DevOps User laden" status={stepStatuses[1]}>
          {currentUser ? (
            <div className="rounded-xl bg-slate-900/50 p-3 space-y-1">
              <p className="text-sm text-slate-200 font-medium">{currentUser.displayName}</p>
              <p className="text-xs font-mono text-slate-500">{currentUser.id}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-300/90">Noch kein Azure User geladen.</p>
          )}
          <Button
            variant="secondary"
            onClick={loadCurrentUser}
            loading={identityLoading}
            disabled={!canResolveIdentity}
          >
            <UserRound size={16} />
            {currentUser ? "Neu laden" : "Azure User laden"}
          </Button>
          {!canResolveIdentity && (
            <p className="text-xs text-slate-500">
              Organisation, Projekt und PAT (oder Demo-Modus) muessen gesetzt sein.
            </p>
          )}
        </StepCard>

        {/* Schritt 3 — Aktivieren */}
        <StepCard number={3} title="Notifications aktivieren" status={stepStatuses[2]}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Status</span>
            {isSubscribed ? (
              <span className="text-green-300">Aktiv</span>
            ) : (
              <span className="text-slate-400">Deaktiviert</span>
            )}
          </div>

          {permissionState === "denied" && (
            <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/20 p-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
              <p className="text-xs text-red-300">
                Browser-Erlaubnis wurde verweigert. Bitte in den Browser-Einstellungen wieder erlauben.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              fullWidth
              onClick={handleSubscribe}
              loading={subscribeLoading}
              disabled={!canSubscribe || isSubscribed}
            >
              <Bell size={16} />
              Aktivieren
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={handleUnsubscribe}
              loading={subscribeLoading}
              disabled={!isSubscribed}
            >
              <BellOff size={16} />
              Deaktivieren
            </Button>
          </div>
        </StepCard>

        {/* Schritt 4 — Webhook-URL */}
        <StepCard number={4} title="Webhook-URL konfigurieren" status={stepStatuses[3]}>
          <div className="flex items-start gap-2 rounded-xl border border-blue-700/30 bg-blue-900/10 p-3">
            <Link2 size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
            <p className="text-xs text-blue-300/90">
              Diese URL ist dein persoenlicher Webhook-Endpunkt. Nur Anfragen mit deinem Token werden
              akzeptiert.
            </p>
          </div>
          {webhookToken ? (
            <WebhookUrlBox token={webhookToken} />
          ) : (
            <p className="text-xs text-slate-500">
              Die Webhook-URL wird nach dem Aktivieren der Notifications angezeigt.
            </p>
          )}
        </StepCard>

        {/* Schritt 5 — Test */}
        <StepCard number={5} title="Test-Notification senden" status={stepStatuses[4]}>
          <p className="text-xs text-slate-500">
            Sendet ein Test-Event vom Typ{" "}
            <span className="font-mono text-slate-300">build.failed</span> direkt an deinen Browser.
          </p>
          <Button fullWidth onClick={handleSendTest} loading={testLoading} disabled={!canSendTest}>
            <Send size={16} />
            Test-Notification senden
          </Button>

          {testResult?.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-green-700/40 bg-green-900/20 p-3">
              <CheckCircle size={16} className="mt-0.5 text-green-400" />
              <p className="text-xs text-green-300">
                Notification gesendet ({testResult.sent}/{testResult.total}). Schau auf Gerät oder Browser.
              </p>
            </div>
          )}

          {testResult && !testResult.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/20 p-3">
              <AlertCircle size={16} className="mt-0.5 text-red-400" />
              <p className="text-xs text-red-300">{testResult.error ?? "Senden fehlgeschlagen"}</p>
            </div>
          )}
        </StepCard>

        {/* Globale Fehlermeldung */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/20 p-3">
            <AlertCircle size={16} className="mt-0.5 text-red-400" />
            <p className="text-xs text-red-300">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
