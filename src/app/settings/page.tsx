"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { usePushState } from "@/lib/hooks/usePushState";
import { ConnectionSettings } from "@/components/settings/ConnectionSettings";
import { PushNotificationsSection } from "@/components/settings/PushNotificationsSection";
import { createAzureClient } from "@/lib/api/client";
import { demoSettings } from "@/lib/mocks/demoData";
import { identityService, type AzureCurrentUser } from "@/lib/services/identityService";
import { pushService } from "@/lib/services/pushService";
import { useTranslations } from "next-intl";
import { ExternalLink, ListChecks, FlaskConical } from "lucide-react";
import type { AppSettings, ThemeMode, Locale } from "@/types";

const EMPTY_SETTINGS: AppSettings = { organization: "", project: "", pat: "", demoMode: false, theme: "dark" };

/** Einstellungsseite für Azure-DevOps-Verbindungsparameter und App-weite Optionen. */
export default function SettingsPage() {
  const { settings, setSettings, clearSettings } = useSettingsStore();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AppSettings>(EMPTY_SETTINGS);
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState("");
  const [saved, setSaved] = useState(false);

  const { supportStatus: pushSupportStatus, permissionState, isSubscribed, webhookToken, refresh: refreshPushState } = usePushState();
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [currentUser, setCurrentUser] = useState<AzureCurrentUser | null>(null);

  useEffect(() => { setForm(settings || EMPTY_SETTINGS); }, [settings]);

  useEffect(() => {
    const org = form.organization || settings?.organization;
    const project = form.project || settings?.project;
    const pat = form.pat || settings?.pat;
    const demoMode = form.demoMode ?? settings?.demoMode ?? false;
    if (!org || !project || (!pat && !demoMode)) { setCurrentUser(null); return; }
    const client = createAzureClient({ organization: org, project, pat: pat || "", demoMode, theme: form.theme });
    identityService.getCurrentUser(client).then(setCurrentUser).catch(() => setCurrentUser(null));
  }, [form.demoMode, form.organization, form.pat, form.project, form.theme, settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = form.theme;
    document.documentElement.style.colorScheme = form.theme;
  }, [form.theme]);

  const handleChangeField = (field: keyof AppSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
    setSaved(false);
  };

  const handleToggleDemoMode = () => {
    setForm((prev) => ({
      ...prev,
      demoMode: !prev.demoMode,
      organization: prev.demoMode ? prev.organization : prev.organization || demoSettings.organization,
      project: prev.demoMode ? prev.project : prev.project || demoSettings.project,
    }));
    setTestResult(null);
    setSaved(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    try {
      if (form.demoMode) { setTestResult("success"); return; }
      const client = createAzureClient(form);
      await client.get(`/${form.project}/_apis/git/repositories?api-version=7.1&$top=1`);
      setTestResult("success");
    } catch (err) {
      setTestResult("error");
      setTestError(err instanceof Error ? err.message : t("connectionFailedFallback"));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const normalized: AppSettings = form.demoMode
      ? { ...form, organization: form.organization || demoSettings.organization, project: form.project || demoSettings.project }
      : form;
    setSettings(normalized);
    setForm(normalized);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm(t("confirmClear"))) {
      clearSettings();
      setForm(EMPTY_SETTINGS);
      setShowPat(false);
      setTestResult(null);
      setTestError("");
      setSaved(false);
      queryClient.clear();
    }
  };

  const handlePushSubscribe = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      const subscription = await pushService.subscribe();
      if (!currentUser) throw new Error(t("noUserError"));
      await pushService.registerSubscription(subscription, form.organization || settings?.organization || "", form.project || settings?.project || "", currentUser.id, currentUser.displayName);
      await refreshPushState();
    } catch (err) {
      setPushError(err instanceof Error ? err.message : t("activationFailed"));
    } finally {
      setPushLoading(false);
    }
  };

  const handlePushUnsubscribe = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      await pushService.unsubscribe();
      await refreshPushState();
    } catch (err) {
      setPushError(err instanceof Error ? err.message : t("deactivationFailed"));
    } finally {
      setPushLoading(false);
    }
  };

  const canTest = form.demoMode || !!(form.organization && form.project && form.pat);
  const canSubscribe = !!(form.organization || settings?.organization);
  const t = useTranslations("settings");

  return (
    <div className="min-h-screen">
      <AppBar title={t("title")} />

      <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        <ConnectionSettings
          form={form}
          showPat={showPat}
          testing={testing}
          testResult={testResult}
          testError={testError}
          saved={saved}
          canTest={canTest}
          hasExistingSettings={!!settings}
          onChangeField={handleChangeField}
          onToggleShowPat={() => setShowPat((v) => !v)}
          onToggleDemoMode={handleToggleDemoMode}
          onChangeTheme={(theme: ThemeMode) => { setForm((prev) => ({ ...prev, theme })); setSaved(false); }}
          onChangeLocale={(locale: Locale) => { setForm((prev) => ({ ...prev, locale })); setSettings({ ...(settings || EMPTY_SETTINGS), ...form, locale }); }}
          onTest={handleTest}
          onSave={handleSave}
          onClear={handleClear}
        />

        <PushNotificationsSection
          pushSupportStatus={pushSupportStatus}
          permissionState={permissionState}
          isSubscribed={isSubscribed}
          webhookToken={webhookToken}
          pushLoading={pushLoading}
          pushError={pushError}
          currentUser={currentUser}
          canSubscribe={canSubscribe}
          onSubscribe={handlePushSubscribe}
          onUnsubscribe={handlePushUnsubscribe}
        />

        {/* Einrichtung */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("setupSection")}</h2>
          <a
            href="/push-setup"
            className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
          >
            <ListChecks size={18} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">{t("startPushWizard")}</p>
              <p className="text-xs text-slate-500">{t("setupPushWizardDesc")}</p>
            </div>
            <ExternalLink size={14} className="flex-shrink-0 text-slate-600" />
          </a>
        </section>

        {/* Entwickler */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("developerSection")}</h2>
          <a
            href="/push-test"
            className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
          >
            <FlaskConical size={18} className="text-purple-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">{t("testPushNotifications")}</p>
              <p className="text-xs text-slate-500">{t("testPushDesc")}</p>
            </div>
            <ExternalLink size={14} className="flex-shrink-0 text-slate-600" />
          </a>
        </section>
      </div>
    </div>
  );
}
