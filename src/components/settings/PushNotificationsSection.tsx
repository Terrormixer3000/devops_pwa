"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, BellOff, AlertCircle, ChevronRight } from "lucide-react";
import { PushSupportHint } from "@/components/ui/PushSupportHint";
import { WebhookUrlBox } from "@/components/ui/WebhookUrlBox";
import type { AzureCurrentUser } from "@/lib/services/identityService";
import type { PushSupportStatus, PushPermissionState } from "@/lib/services/pushService";
import { PUSH_EVENT_TYPES } from "@/lib/utils/pushEventPreferences";
import type { PushEventPreferences, PushEventType } from "@/types";

interface PushNotificationsSectionProps {
  pushSupportStatus: PushSupportStatus;
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  webhookToken: string | null;
  pushLoading: boolean;
  pushError: string;
  currentUser: AzureCurrentUser | null;
  canSubscribe: boolean;
  pushEventPreferences: PushEventPreferences;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onToggleEventPreference: (eventType: PushEventType) => void;
}

/** Sektion für Push-Notification-Verwaltung in den Einstellungen. */
export function PushNotificationsSection({
  pushSupportStatus, permissionState, isSubscribed, webhookToken,
  pushLoading, pushError, currentUser, canSubscribe, pushEventPreferences, onSubscribe, onUnsubscribe, onToggleEventPreference,
}: PushNotificationsSectionProps) {
  const t = useTranslations("push");

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("title")}</h2>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-4">
        <div className="flex items-start gap-3">
          <Bell size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">{t("setupPush")}</p>
            <p className="text-xs text-slate-500">{t("setupPushDesc")}</p>
          </div>
        </div>
      </div>

      {pushSupportStatus !== "supported" && <PushSupportHint status={pushSupportStatus} />}

      {pushSupportStatus === "supported" && permissionState === "denied" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-700/40 bg-red-900/20 p-4">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-300">{t("permissionDenied")}</p>
            <p className="text-xs text-red-400/80">
              {t("permissionDeniedHint")}
            </p>
          </div>
        </div>
      )}

      {pushSupportStatus === "supported" && permissionState !== "denied" && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-start gap-3">
            {isSubscribed
              ? <Bell size={18} className="mt-0.5 flex-shrink-0 text-blue-400" />
              : <BellOff size={18} className="mt-0.5 flex-shrink-0 text-slate-500" />
            }
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">{t("pushNotifications")}</p>
              <p className="text-xs text-slate-500">
                {isSubscribed ? t("activeDesc") : t("deactivated")}
              </p>
              {currentUser && (
                <p className="text-[11px] text-slate-500">
                  {t("assignedTo")}: {currentUser.displayName} · {currentUser.id}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={isSubscribed ? onUnsubscribe : onSubscribe}
            disabled={pushLoading || !canSubscribe}
            className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${isSubscribed ? "bg-blue-600" : "bg-slate-700"}`}
            aria-pressed={isSubscribed}
          >
            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${isSubscribed ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>
      )}

      {pushError && (
        <div className="rounded-xl border border-red-700/50 bg-red-900/30 p-3">
          <p className="text-sm text-red-300">{pushError}</p>
        </div>
      )}

      {pushSupportStatus === "supported" && isSubscribed && !webhookToken && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 p-4">
          <p className="text-xs text-amber-300">{t("webhookNoToken")}</p>
        </div>
      )}

      {pushSupportStatus === "supported" && isSubscribed && webhookToken && (
        <>
          <WebhookUrlBox token={webhookToken} />

          <Link
            href="/push-test"
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-slate-200">{t("testEvent")}</p>
              <p className="text-xs text-slate-500">{t("testPageHint")}</p>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-slate-500" />
          </Link>
        </>
      )}

      <div className="space-y-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{t("notificationsFor")}</p>
          <p className="text-xs text-slate-500">{t("notificationTypesHint")}</p>
        </div>

        {PUSH_EVENT_TYPES.map((eventType) => {
          const enabled = pushEventPreferences[eventType];
          const label = {
            "pr.reviewer": t("prReviewRequest"),
            "pr.comment": t("prComment"),
            "build.failed": t("buildFailed"),
            "build.succeeded": t("buildSuccess"),
            "release.approval": t("releasePending"),
          }[eventType];

          return (
            <div key={eventType} className="flex items-start justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/30 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">
                  {enabled ? t("typeEnabled") : t("typeDisabled")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleEventPreference(eventType)}
                disabled={pushLoading}
                className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${enabled ? "bg-blue-600" : "bg-slate-700"}`}
                aria-pressed={enabled}
              >
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          );
        })}
      </div>

      {pushSupportStatus === "supported" && !isSubscribed && (
        <Link
          href="/push-test"
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-200">{t("testTitle")}</p>
            <p className="text-xs text-slate-500">{t("testPageLockedHint")}</p>
          </div>
          <ChevronRight size={16} className="flex-shrink-0 text-slate-500" />
        </Link>
      )}
    </section>
  );
}
