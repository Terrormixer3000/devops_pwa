"use client";

/**
 * Push-Test-Seite: Ermoeglicht das manuelle Testen von Push-Benachrichtigungen
 * und zeigt den aktuellen Abonnementsstatus an.
 */

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { usePushState } from "@/lib/hooks/usePushState";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PushSupportHint } from "@/components/ui/PushSupportHint";
import { WebhookUrlBox } from "@/components/ui/WebhookUrlBox";
import { type PushPermissionState, type PushSupportStatus } from "@/lib/services/pushService";
import {
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  GitPullRequest,
  MessageSquare,
  Rocket,
  Play,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { PushEventType } from "@/types";

type TestEventType = PushEventType;

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

// Status-Badge fuer eine Subscription
/** Zeigt den aktuellen Status eines Push-Abonnements (aktiv/inaktiv/Fehler). */
function SubscriptionStatus({
  isSubscribed,
  permission,
  supportStatus,
}: {
  isSubscribed: boolean;
  permission: PushPermissionState;
  supportStatus: PushSupportStatus;
}) {
  const t = useTranslations("push");
  if (supportStatus === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-400">
        <BellOff size={12} />
        {t("notSupported")}
      </span>
    );
  }
  if (supportStatus === "needs-https" || supportStatus === "needs-pwa-install" || supportStatus === "needs-service-worker") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-400">
        <AlertCircle size={12} />
        {t("setupNeeded")}
      </span>
    );
  }
  if (permission === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/40 text-red-400">
        <XCircle size={12} />
        {t("permissionDenied")}
      </span>
    );
  }
  if (isSubscribed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/40 text-green-400">
        <CheckCircle size={12} />
        {t("active")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-400">
      <BellOff size={12} />
      {t("notSubscribed")}
    </span>
  );
}

// Ergebnis-Anzeige nach einem Test-Versand
/** Banner mit Ergebnis des zuletzt gesendeten Push-Tests (Erfolg/Fehler). */
function ResultBanner({ result }: { result: TestResult | null }) {
  const t = useTranslations("push");
  const tc = useTranslations("common");
  if (!result) return null;

  if (result.ok) {
    return (
      <div className="flex items-start gap-3 p-3.5 bg-green-900/25 border border-green-700/40 rounded-xl">
        <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-green-300">
            {t("notificationSent", { sent: result.sent ?? 0, total: result.total ?? 0 })}
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
        <p className="text-sm font-medium text-red-300">{tc("error")}</p>
        <p className="text-xs text-red-400/70 mt-0.5">{result.error}</p>
      </div>
    </div>
  );
}

// Webhook-URL Anzeige — moved to shared WebhookUrlBox component

/** Testseite fuer Push-Benachrichtigungen mit Abonnement-Verwaltung und Test-Ausloesung. */
export default function PushTestPage() {
  const { settings } = useSettingsStore();
  const t = useTranslations("push");

  const EVENTS: EventConfig[] = [
    {
      type: "build.failed",
      label: t("buildFailed"),
      description: t("eventBuildFailedDesc"),
      icon: <XCircle size={18} />,
      color: "text-red-400",
    },
    {
      type: "build.succeeded",
      label: t("buildSuccess"),
      description: t("eventBuildSuccessDesc"),
      icon: <CheckCircle size={18} />,
      color: "text-green-400",
    },
    {
      type: "pr.reviewer",
      label: t("prReviewRequest"),
      description: t("eventPrReviewerDesc"),
      icon: <GitPullRequest size={18} />,
      color: "text-blue-400",
    },
    {
      type: "pr.comment",
      label: t("prComment"),
      description: t("eventPrCommentDesc"),
      icon: <MessageSquare size={18} />,
      color: "text-purple-400",
    },
    {
      type: "release.approval",
      label: t("releasePending"),
      description: t("eventReleaseApprovalDesc"),
      icon: <Rocket size={18} />,
      color: "text-amber-400",
    },
  ];

  const {
    supportStatus,
    permissionState: permission,
    isSubscribed,
    webhookToken,
    isLoading: pushStateLoading,
  } = usePushState();

  const tSettings = useTranslations("settings");
  const appBarTitle = (
    <Link
      href="/settings"
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      {tSettings("title")}
    </Link>
  );
  const { currentUser } = useCurrentUser();

  // Test-State
  const [loadingEvent, setLoadingEvent] = useState<TestEventType | null>(null);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);
  const [lastTestedEvent, setLastTestedEvent] = useState<TestEventType | null>(null);

  // Test-Notification senden
  const handleTest = async (eventType: TestEventType) => {
    if (!webhookToken) {
      setLastResult({ ok: false, error: t("missingWebhookToken") });
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
          token: webhookToken,
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
      setLastResult({ ok: false, error: err instanceof Error ? err.message : t("networkError") });
    } finally {
      setLoadingEvent(null);
    }
  };

  const canTest =
    supportStatus === "supported" &&
    isSubscribed &&
    !!webhookToken;

  if (pushStateLoading) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />
        <PageLoader />
      </div>
    );
  }

  if (!webhookToken) {
    return (
      <div className="min-h-screen">
        <AppBar title={appBarTitle} />

        <div className="px-4 py-4 max-w-lg mx-auto">
          <section className="space-y-4 rounded-2xl border border-blue-700/30 bg-slate-800/40 p-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-100">{t("settingsFirst")}</h2>
              <p className="text-sm text-slate-400">
                {t("settingsFirstDesc")}
              </p>
            </div>

            <Link
              href="/settings"
              className="flex items-center justify-between gap-3 rounded-xl border border-blue-700/40 bg-blue-900/15 p-3.5 text-left transition-colors hover:bg-blue-900/25"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-blue-300">{t("goToSettings")}</p>
                <p className="text-xs text-blue-400/70">{t("goToSettingsDesc")}</p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 text-blue-400" />
            </Link>

            <p className="text-xs text-slate-500">
              {t("unlockHint")}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppBar title={appBarTitle} />

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">

        {/* Schritt 1: Status & Subscription */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {t("subscriptionSectionTitle")}
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
              <span className="text-slate-500">{t("orgLabel")}</span>
              <span className="text-slate-300 font-mono">
                {settings?.organization || <span className="text-red-400">{t("notSet")}</span>}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t("projectLabel")}</span>
              <span className="text-slate-300 font-mono">
                {settings?.project || <span className="text-red-400">{t("notSet")}</span>}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t("mode")}</span>
              <span className={settings?.demoMode ? "text-amber-400" : "text-slate-300"}>
                {settings?.demoMode ? t("modeDemo") : t("modeLive")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-500">{t("azureUserLabel")}</span>
              <span className="text-slate-300 font-mono text-right truncate">
                {currentUser ? currentUser.displayName : <span className="text-amber-400">{t("userLoading")}</span>}
              </span>
            </div>
            {currentUser && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-500">{t("userIdLabel")}</span>
                <span className="text-slate-300 font-mono text-right truncate">{currentUser.id}</span>
              </div>
            )}
          </div>

          {/* Kontext-Banner je nach Support-Status */}
          {supportStatus !== "supported" && <PushSupportHint status={supportStatus} />}

          {/* Kein Settings-Hinweis */}
          {supportStatus === "supported" && (!settings?.organization || !settings?.project) && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                {t("configureHint")}
              </p>
            </div>
          )}

          {/* CTA: Nicht abonniert → Settings */}
          {supportStatus === "supported" && !isSubscribed && permission !== "denied" && (
            <Link
              href="/settings"
              className="flex items-center justify-between gap-3 w-full rounded-xl border border-blue-700/40 bg-blue-900/15 p-3.5 text-left transition-colors hover:bg-blue-900/25"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-blue-300">{t("notSetupYet")}</p>
                <p className="text-xs text-blue-400/70">{t("goToSettingsShort")}</p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 text-blue-400" />
            </Link>
          )}

          {/* Webhook-URL (read-only) */}
          {isSubscribed && webhookToken && (
            <WebhookUrlBox token={webhookToken} compact />
          )}

          {permission === "denied" && (
            <div className="flex items-start gap-2.5 p-3 bg-red-900/20 border border-red-700/40 rounded-xl">
              <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                {t("permissionDeniedHint")}
              </p>
            </div>
          )}
        </section>

        <div className="border-t border-slate-700/50" />

        {/* Schritt 2: Events testen */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            {t("eventsSectionTitle")}
          </h2>

          {!canTest && (
            <div className="flex items-start gap-2.5 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <AlertCircle size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                {t("testDisabledHint")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {EVENTS.map((event) => {
              const isLoading = loadingEvent === event.type;
              const wasLast = lastTestedEvent === event.type;
              const isEventEnabled = settings?.pushEventPreferences?.[event.type] ?? true;
              const canTriggerEvent = canTest && isEventEnabled;

              return (
                <button
                  key={event.type}
                  onClick={() => handleTest(event.type)}
                  disabled={!canTriggerEvent || loadingEvent !== null}
                  className="w-full flex items-center gap-3 p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-left transition-colors hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  <span className={`flex-shrink-0 ${event.color}`}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : event.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{event.label}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {isEventEnabled ? event.description : t("eventDisabledInSettings")}
                    </p>
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
            {t("howItWorksTitle")}
          </h2>
          <div className="p-4 bg-slate-800/30 rounded-xl space-y-3 text-xs text-slate-500">
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">1</span>
              <p>{t("howItWorks1")}</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">2</span>
              <p>{t("howItWorks2")}</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">3</span>
              <p>{t("howItWorks3")}</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-mono font-bold">4</span>
              <p>
                {t.rich("howItWorks4", {
                  path: () => <span className="font-mono text-slate-400">/api/push/webhook</span>,
                })}
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
