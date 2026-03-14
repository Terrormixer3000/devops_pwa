"use client";

import { useTranslations } from "next-intl";
import { Bell, BellOff, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import { PushSupportHint } from "@/components/ui/PushSupportHint";
import type { AzureCurrentUser } from "@/lib/services/identityService";
import type { PushSupportStatus, PushPermissionState } from "@/lib/services/pushService";

interface PushNotificationsSectionProps {
  pushSupportStatus: PushSupportStatus;
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  webhookToken: string | null;
  pushLoading: boolean;
  pushError: string;
  currentUser: AzureCurrentUser | null;
  canSubscribe: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}

/** Sektion für Push-Notification-Verwaltung in den Einstellungen. */
export function PushNotificationsSection({
  pushSupportStatus, permissionState, isSubscribed, webhookToken,
  pushLoading, pushError, currentUser, canSubscribe, onSubscribe, onUnsubscribe,
}: PushNotificationsSectionProps) {
  const t = useTranslations("push");
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("title")}</h2>

      {!webhookToken ? (
        <a
          href="/push-setup"
          className="flex items-center gap-3 p-4 bg-slate-800/50 border border-blue-700/30 rounded-xl transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
        >
          <Bell size={18} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">{t("setupPush")}</p>
            <p className="text-xs text-slate-500">{t("setupPushDesc")}</p>
          </div>
          <ChevronRight size={16} className="flex-shrink-0 text-slate-500" />
        </a>
      ) : (
        <>
          {pushSupportStatus !== "supported" && <PushSupportHint status={pushSupportStatus} />}

          {pushSupportStatus === "supported" && permissionState === "denied" && (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/40 rounded-xl">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-300">{t("permissionDenied")}</p>
                <p className="text-xs text-red-400/80">
                  {t("permissionDeniedHint")}
                </p>
              </div>
            </div>
          )}

          {pushSupportStatus === "supported" && permissionState !== "denied" && (
            <div className="flex items-start justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-start gap-3">
                {isSubscribed
                  ? <Bell size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  : <BellOff size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
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
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${isSubscribed ? "bg-blue-600" : "bg-slate-700"}`}
                aria-pressed={isSubscribed}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isSubscribed ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          {pushError && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
              <p className="text-sm text-red-300">{pushError}</p>
            </div>
          )}

          {pushSupportStatus === "supported" && isSubscribed && (
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl space-y-2">
              <p className="text-xs font-medium text-slate-400">{t("notificationsFor")}</p>
              {[
                t("prReviewRequest"),
                t("buildFailed"),
                t("buildSuccess"),
                t("releasePending"),
                t("prComment"),
              ].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-blue-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
