"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, AlertCircle, Bell, BellOff, Loader2, UserRound, Send, ShieldCheck } from "lucide-react";
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

function StepBadge({ label, status }: { label: string; status: StepStatus }) {
  if (status === "done") {
    return <Badge variant="success">{label}</Badge>;
  }
  if (status === "active") {
    return <Badge variant="info">{label}</Badge>;
  }
  return <Badge variant="muted">{label}</Badge>;
}

function SupportHint({ status }: { status: PushSupportStatus }) {
  if (status === "supported") {
    return (
      <p className="text-xs text-green-300/90">
        Browser und Service Worker sind bereit fuer Push.
      </p>
    );
  }

  if (status === "needs-https") {
    return (
      <p className="text-xs text-amber-300/90">
        HTTPS erforderlich. Bitte ueber <span className="font-mono">https://localhost:3000</span> oeffnen.
      </p>
    );
  }

  if (status === "needs-pwa-install") {
    return (
      <p className="text-xs text-amber-300/90">
        Auf iOS sind Push-Nachrichten nur in der installierten PWA verfuegbar (&quot;Zum Home-Bildschirm hinzufuegen&quot;).
      </p>
    );
  }

  if (status === "needs-service-worker") {
    return (
      <p className="text-xs text-amber-300/90">
        Kein aktiver Service Worker. Bitte <span className="font-mono">/sw.js</span> pruefen und Seite hart neu laden.
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-400">
      Dieser Browser unterstuetzt Push nicht.
    </p>
  );
}

async function readJsonOrFallback(response: Response): Promise<{ error?: string }> {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return { error: `HTTP ${response.status}` };
  }
}

export default function PushSetupPage() {
  const { settings } = useSettingsStore();

  const [supportStatus, setSupportStatus] = useState<PushSupportStatus>("unsupported");
  const [permissionState, setPermissionState] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

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

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const canResolveIdentity = hasProjectScope && hasCredentials;
  const canSubscribe =
    supportStatus === "supported" &&
    permissionState !== "denied" &&
    !!currentUser &&
    hasProjectScope;
  const canSendTest = canSubscribe && isSubscribed;

  const prerequisitesDone = supportStatus === "supported" && hasProjectScope;
  const identityDone = !!currentUser;
  const subscriptionDone = isSubscribed;
  const testDone = !!testResult?.ok;

  const stepStatuses = useMemo(
    () => [
      { id: "1", label: "1 Voraussetzungen", status: prerequisitesDone ? "done" : "active" as StepStatus },
      {
        id: "2",
        label: "2 Azure User",
        status: identityDone ? "done" : prerequisitesDone ? "active" : "blocked" as StepStatus,
      },
      {
        id: "3",
        label: "3 Aktivieren",
        status: subscriptionDone ? "done" : identityDone ? "active" : "blocked" as StepStatus,
      },
      {
        id: "4",
        label: "4 Test",
        status: testDone ? "done" : subscriptionDone ? "active" : "blocked" as StepStatus,
      },
    ],
    [identityDone, prerequisitesDone, subscriptionDone, testDone]
  );

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    setErrorMessage("");
    setTestResult(null);

    try {
      if (!currentUser) {
        throw new Error("Azure User konnte nicht geladen werden.");
      }
      if (!organization || !project) {
        throw new Error("Organisation und Projekt muessen gesetzt sein.");
      }

      const subscription = await pushService.subscribe();
      await pushService.registerSubscription(
        subscription,
        organization,
        project,
        currentUser.id,
        currentUser.displayName
      );
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
      <AppBar title="Push-Wizard" />

      <div className="mx-auto max-w-lg space-y-5 px-4 py-4">
        <BackLink href="/settings" className="mb-1" />

        <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Push Notification Setup</h2>
          </div>
          <p className="text-xs text-slate-500">
            Der Wizard fuehrt dich durch Voraussetzungen, User-Zuordnung, Aktivierung und Test.
          </p>
          <div className="flex flex-wrap gap-2">
            {stepStatuses.map((step) => (
              <StepBadge key={step.id} label={step.label} status={step.status} />
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <h3 className="text-sm font-medium text-slate-200">1. Voraussetzungen</h3>
          <div className="space-y-1 text-xs text-slate-500">
            <p>
              Organisation: {organization ? <span className="font-mono text-slate-300">{organization}</span> : <span className="text-amber-400">nicht gesetzt</span>}
            </p>
            <p>
              Projekt: {project ? <span className="font-mono text-slate-300">{project}</span> : <span className="text-amber-400">nicht gesetzt</span>}
            </p>
          </div>
          <SupportHint status={supportStatus} />
          <Button variant="secondary" onClick={refreshPushState} loading={statusLoading}>
            Status neu pruefen
          </Button>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <h3 className="text-sm font-medium text-slate-200">2. Azure User zuordnen</h3>
          {currentUser ? (
            <div className="space-y-1 text-xs text-slate-500">
              <p className="text-slate-300">{currentUser.displayName}</p>
              <p className="font-mono">{currentUser.id}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-300/90">Kein Azure User geladen.</p>
          )}
          <Button
            variant="secondary"
            onClick={loadCurrentUser}
            loading={identityLoading}
            disabled={!canResolveIdentity}
          >
            <UserRound size={16} />
            Azure User laden
          </Button>
          {!canResolveIdentity && (
            <p className="text-xs text-slate-500">Bitte erst Organisation, Projekt und PAT speichern (oder Demo Modus nutzen).</p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <h3 className="text-sm font-medium text-slate-200">3. Notifications aktivieren</h3>
          <p className="text-xs text-slate-500">
            Status: {isSubscribed ? <span className="text-green-300">aktiv</span> : <span className="text-slate-400">deaktiviert</span>}
          </p>
          {permissionState === "denied" && (
            <p className="text-xs text-red-300">Browser-Erlaubnis wurde verweigert. Bitte in den Browser-Einstellungen wieder erlauben.</p>
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
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <h3 className="text-sm font-medium text-slate-200">4. Test senden</h3>
          <p className="text-xs text-slate-500">
            Es wird ein Test-Event vom Typ <span className="font-mono text-slate-300">build.failed</span> versendet.
          </p>
          <Button fullWidth onClick={handleSendTest} loading={testLoading} disabled={!canSendTest}>
            {testLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Test-Notification senden
          </Button>

          {testResult?.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-green-700/40 bg-green-900/20 p-3">
              <CheckCircle size={16} className="mt-0.5 text-green-400" />
              <p className="text-xs text-green-300">Notification wurde gesendet ({testResult.sent}/{testResult.total}).</p>
            </div>
          )}

          {testResult && !testResult.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/20 p-3">
              <AlertCircle size={16} className="mt-0.5 text-red-400" />
              <p className="text-xs text-red-300">{testResult.error || "Senden fehlgeschlagen"}</p>
            </div>
          )}
        </section>

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
