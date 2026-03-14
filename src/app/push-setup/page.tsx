"use client";

/**
 * Push-Einrichtungs-Wizard: Fuehrt den Nutzer in 5 Schritten durch die Einrichtung
 * von Web-Push-Benachrichtigungen (VAPID-Schluessel, Service Worker, Webhook-URL).
 */

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Bell,
  BellOff,
  UserRound,
  Send,
  ShieldCheck,
  Link2,
} from "lucide-react";
import { AppBar } from "@/components/layout/AppBar";
import { BackLink } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PushSupportHint } from "@/components/ui/PushSupportHint";
import { WebhookUrlBox } from "@/components/ui/WebhookUrlBox";
import { usePushState } from "@/lib/hooks/usePushState";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { pushService } from "@/lib/services/pushService";
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
// Moved to shared PushSupportHint component

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
        <StepCardBlocked />
      )}
    </section>
  );
}

function StepCardBlocked() {
  const t = useTranslations("push");
  return <p className="text-xs text-slate-600">{t("blockedHint")}</p>;
}

/** Zeigt die generierte Webhook-URL mit Kopier-Schaltflaeche an. */
// Moved to shared WebhookUrlBox component

/** 5-Schritte-Wizard zur Ersteinrichtung von Push-Benachrichtigungen. */
export default function PushSetupPage() {
  const { settings } = useSettingsStore();

  const { supportStatus, permissionState, isSubscribed, webhookToken, isLoading: statusLoading, refresh: refreshPushState } = usePushState();
  const { currentUser, isLoading: identityLoading, refetch: loadCurrentUser } = useCurrentUser();

  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const organization = settings?.organization ?? "";
  const project = settings?.project ?? "";
  const hasProjectScope = !!organization && !!project;
  const hasCredentials = !!settings?.demoMode || !!settings?.pat;

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

  const t = useTranslations("push");

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    setErrorMessage("");
    setTestResult(null);

    try {
      if (!currentUser) throw new Error(t("noUserLoadError"));
      if (!organization || !project) throw new Error(t("orgProjectRequired"));

      const subscription = await pushService.subscribe();
      const { webhookToken: token } = await pushService.registerSubscription(
        subscription,
        organization,
        project,
        currentUser.id,
        currentUser.displayName
      );

      pushService.storeToken(token);
      await refreshPushState();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t("activationFailed"));
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
      setErrorMessage(err instanceof Error ? err.message : t("deactivationFailed"));
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!organization || !project || !currentUser) {
      setErrorMessage(t("orgProjectUserRequired"));
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
      setTestResult({ ok: false, error: err instanceof Error ? err.message : t("networkError") });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppBar title={t("wizardTitle")} />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <BackLink href="/settings" className="mb-1" />

        {/* Header + Fortschritts-Badges */}
        <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              {t("wizardTitle")}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {t("wizardSubtitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {[t("step1"), t("step2"), t("step3"), t("step4"), t("step5")].map(
              (label, i) => (
                <StepBadge key={label} label={`${i + 1} ${label}`} status={stepStatuses[i]} />
              )
            )}
          </div>
        </div>

        {/* Schritt 1 — Voraussetzungen */}
        <StepCard number={1} title={t("step1Title")} status={stepStatuses[0]}>
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>{t("orgLabel")}</span>
              {organization ? (
                <span className="font-mono text-slate-300">{organization}</span>
              ) : (
                <span className="text-amber-400">{t("notSet")}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>{t("projectLabel")}</span>
              {project ? (
                <span className="font-mono text-slate-300">{project}</span>
              ) : (
                <span className="text-amber-400">{t("notSet")}</span>
              )}
            </div>
          </div>
          <PushSupportHint status={supportStatus} compact />
          {!hasProjectScope && (
            <p className="text-xs text-slate-500">
              {t("configureHint")}
            </p>
          )}
          <Button variant="secondary" onClick={refreshPushState} loading={statusLoading}>
            {t("checkStatus")}
          </Button>
        </StepCard>

        {/* Schritt 2 — Azure User */}
        <StepCard number={2} title={t("step2Title")} status={stepStatuses[1]}>
          {currentUser ? (
            <div className="rounded-xl bg-slate-900/50 p-3 space-y-1">
              <p className="text-sm text-slate-200 font-medium">{currentUser.displayName}</p>
              <p className="text-xs font-mono text-slate-500">{currentUser.id}</p>
            </div>
          ) : (
            <p className="text-xs text-amber-300/90">{t("noUserLoaded")}</p>
          )}
          <Button
            variant="secondary"
            onClick={loadCurrentUser}
            loading={identityLoading}
            disabled={!canResolveIdentity}
          >
            <UserRound size={16} />
            {currentUser ? t("reloadUser") : t("loadUser")}
          </Button>
          {!canResolveIdentity && (
            <p className="text-xs text-slate-500">
              {t("userRequirements")}
            </p>
          )}
        </StepCard>

        {/* Schritt 3 — Aktivieren */}
        <StepCard number={3} title={t("step3Title")} status={stepStatuses[2]}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{t("statusLabel")}</span>
            {isSubscribed ? (
              <span className="text-green-300">{t("active")}</span>
            ) : (
              <span className="text-slate-400">{t("deactivated")}</span>
            )}
          </div>

          {permissionState === "denied" && (
            <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/20 p-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
              <p className="text-xs text-red-300">
                {t("permissionDeniedHint")}
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
              {t("activate")}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={handleUnsubscribe}
              loading={subscribeLoading}
              disabled={!isSubscribed}
            >
              <BellOff size={16} />
              {t("deactivate")}
            </Button>
          </div>
        </StepCard>

        {/* Schritt 4 — Webhook-URL */}
        <StepCard number={4} title={t("step4Title")} status={stepStatuses[3]}>
          <div className="flex items-start gap-2 rounded-xl border border-blue-700/30 bg-blue-900/10 p-3">
            <Link2 size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
            <p className="text-xs text-blue-300/90">
              {t("webhookInfo")}
            </p>
          </div>
          {webhookToken ? (
            <WebhookUrlBox token={webhookToken} />
          ) : (
            <p className="text-xs text-slate-500">
              {t("webhookNoToken")}
            </p>
          )}
        </StepCard>

        {/* Schritt 5 — Test */}
        <StepCard number={5} title={t("step5Title")} status={stepStatuses[4]}>
          <p className="text-xs text-slate-500">
            {t("testDescription", { eventType: "build.failed" })}
          </p>
          <Button fullWidth onClick={handleSendTest} loading={testLoading} disabled={!canSendTest}>
            <Send size={16} />
            {t("sendTest")}
          </Button>

          {testResult?.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-green-700/40 bg-green-900/20 p-3">
              <CheckCircle size={16} className="mt-0.5 text-green-400" />
              <p className="text-xs text-green-300">
                {t("notificationSent", { sent: testResult.sent ?? 0, total: testResult.total ?? 0 })}
              </p>
            </div>
          )}

          {testResult && !testResult.ok && (
            <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/20 p-3">
              <AlertCircle size={16} className="mt-0.5 text-red-400" />
              <p className="text-xs text-red-300">{testResult.error ?? t("sendFailed")}</p>
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
