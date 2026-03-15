"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { usePushState } from "@/lib/hooks/usePushState";
import { ConnectionSettings } from "@/components/settings/ConnectionSettings";
import { PushNotificationsSection } from "@/components/settings/PushNotificationsSection";
import { createAzureClient } from "@/lib/api/client";
import { demoSettings } from "@/lib/mocks/demoData";
import { identityService, type AzureCurrentUser } from "@/lib/services/identityService";
import { projectsService } from "@/lib/services/projectsService";
import { pushService } from "@/lib/services/pushService";
import { useTranslations } from "next-intl";
import { DEFAULT_PUSH_EVENT_PREFERENCES } from "@/lib/utils/pushEventPreferences";
import type { AppSettings, PushEventPreferences, PushEventType, ThemeMode, Locale } from "@/types";

const EMPTY_SETTINGS: AppSettings = {
  organization: "",
  project: "",
  availableProjects: [],
  pat: "",
  demoMode: false,
  theme: "dark",
  pushEventPreferences: DEFAULT_PUSH_EVENT_PREFERENCES,
};

/** Einstellungsseite für Azure-DevOps-Verbindungsparameter und App-weite Optionen. */
export default function SettingsPage() {
  const { settings, setSettings, clearSettings } = useSettingsStore();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AppSettings>(EMPTY_SETTINGS);
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState("");
  const [saveError, setSaveError] = useState("");
  // Verhindert Autosave beim ersten Mount
  const didMount = useRef(false);

  const { supportStatus: pushSupportStatus, permissionState, isSubscribed, webhookToken, refresh: refreshPushState } = usePushState();
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [currentUser, setCurrentUser] = useState<AzureCurrentUser | null>(null);
  const [discoveringProjects, setDiscoveringProjects] = useState(false);
  // Projekte, die die API kennt, aber noch nicht in availableProjects gespeichert sind
  const [discoveredProjects, setDiscoveredProjects] = useState<string[]>([]);

  useEffect(() => { setForm(settings || EMPTY_SETTINGS); }, [settings]);

  // Einstellungen im localStorage speichern (Demo-Mode normalisiert Org/Projekt)
  const saveNow = (data: AppSettings) => {
    try {
      const normalized = data.demoMode
        ? { ...data, organization: data.organization || demoSettings.organization, project: data.project || demoSettings.project }
        : data;
      setSettings(normalized);
      setSaveError("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  // Autosave: 600ms nach der letzten Formularaenderung speichern
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const timer = setTimeout(() => saveNow(form), 600);
    return () => clearTimeout(timer);
  // saveNow absichtlich nicht als Dependency (referenziell stabil)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    const org = form.organization || settings?.organization;
    const project = form.project || settings?.project;
    const pat = form.pat || settings?.pat;
    const demoMode = form.demoMode ?? settings?.demoMode ?? false;
    if (!org || !project || (!pat && !demoMode)) { setCurrentUser(null); return; }
    const client = createAzureClient({
      organization: org,
      project,
      pat: pat || "",
      demoMode,
      theme: form.theme,
      pushEventPreferences: settings?.pushEventPreferences ?? DEFAULT_PUSH_EVENT_PREFERENCES,
    });
    identityService.getCurrentUser(client).then(setCurrentUser).catch(() => setCurrentUser(null));
  }, [form.demoMode, form.organization, form.pat, form.project, form.theme, settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = form.theme;
    document.documentElement.style.colorScheme = form.theme;
  }, [form.theme]);

  const handleChangeField = (field: keyof AppSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleToggleDemoMode = () => {
    const newForm = {
      ...form,
      demoMode: !form.demoMode,
      organization: form.demoMode ? form.organization : form.organization || demoSettings.organization,
      project: form.demoMode ? form.project : form.project || demoSettings.project,
    };
    setForm(newForm);
    setTestResult(null);
    saveNow(newForm);
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

  const handleClear = () => {
    if (confirm(t("confirmClear"))) {
      clearSettings();
      setForm(EMPTY_SETTINGS);
      setShowPat(false);
      setTestResult(null);
      setTestError("");
      setSaveError("");
      queryClient.clear();
    }
  };

  const handlePushSubscribe = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      const subscription = await pushService.subscribe();
      if (!currentUser) throw new Error(t("noUserError"));
      const { webhookToken: token } = await pushService.registerSubscription(
        subscription,
        form.organization || settings?.organization || "",
        form.project || settings?.project || "",
        currentUser.id,
        currentUser.displayName,
        form.pushEventPreferences
      );
      pushService.storeToken(token);
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

  const persistPushPreferences = (nextPreferences: PushEventPreferences) => {
    const nextForm = { ...form, pushEventPreferences: nextPreferences };
    setForm(nextForm);
    saveNow(nextForm);
  };

  const handleTogglePushEvent = async (eventType: PushEventType) => {
    const nextPreferences: PushEventPreferences = {
      ...form.pushEventPreferences,
      [eventType]: !form.pushEventPreferences[eventType],
    };

    if (!isSubscribed) {
      persistPushPreferences(nextPreferences);
      return;
    }

    const organization = form.organization || settings?.organization || "";
    const project = form.project || settings?.project || "";
    if (!organization || !project || !currentUser) {
      setPushError(t("preferencesSyncUnavailable"));
      return;
    }

    if (!webhookToken) {
      setPushError(t("missingWebhookToken"));
      return;
    }

    setPushLoading(true);
    setPushError("");
    try {
      const subscription = await pushService.getExistingSubscription();
      if (!subscription) {
        throw new Error(t("subscriptionMissing"));
      }
      const { webhookToken: token } = await pushService.registerSubscription(
        subscription,
        organization,
        project,
        currentUser.id,
        currentUser.displayName,
        nextPreferences
      );
      pushService.storeToken(token);
      persistPushPreferences(nextPreferences);
      await refreshPushState();
    } catch (err) {
      setPushError(err instanceof Error ? err.message : t("preferencesUpdateFailed"));
    } finally {
      setPushLoading(false);
    }
  };

  const handleAddProject = (name: string) => {
    const existing = form.availableProjects ?? [];
    if (existing.includes(name)) return;
    const updated = [...existing, name];
    const activeProject = form.project || name;
    const newForm = { ...form, availableProjects: updated, project: activeProject };
    setForm(newForm);
    saveNow(newForm);
    setDiscoveredProjects((prev) => prev.filter((p) => p !== name));
  };

  const handleRemoveProject = (name: string) => {
    const updated = (form.availableProjects ?? []).filter((p) => p !== name);
    const newActive = form.project === name ? (updated[0] ?? "") : form.project;
    const newForm = { ...form, availableProjects: updated, project: newActive };
    setForm(newForm);
    saveNow(newForm);
  };

  const handleSetActiveProject = (name: string) => {
    const newForm = { ...form, project: name };
    setForm(newForm);
    saveNow(newForm);
  };

  const handleDiscoverProjects = async () => {
    if (!form.organization || !form.pat) return;
    setDiscoveringProjects(true);
    try {
      const client = createAzureClient({ ...form, project: form.project || "_" });
      const projects = await projectsService.listProjects(client);
      const existingNames = form.availableProjects ?? [];
      const newProjects = projects.map((p) => p.name).filter((n) => !existingNames.includes(n));
      setDiscoveredProjects(newProjects);
    } catch {
      setDiscoveredProjects([]);
    } finally {
      setDiscoveringProjects(false);
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
          canTest={canTest}
          hasExistingSettings={!!settings}
          availableProjects={form.availableProjects ?? []}
          discoveringProjects={discoveringProjects}
          discoveredProjects={discoveredProjects}
          onChangeField={handleChangeField}
          onToggleShowPat={() => setShowPat((v) => !v)}
          onToggleDemoMode={handleToggleDemoMode}
          onChangeTheme={(theme: ThemeMode) => { setForm((prev) => ({ ...prev, theme })); }}
          onChangeLocale={(locale: Locale) => { setForm((prev) => ({ ...prev, locale })); }}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          onSetActiveProject={handleSetActiveProject}
          onDiscoverProjects={() => { void handleDiscoverProjects(); }}
          onTest={handleTest}
          onClear={handleClear}
          saveError={saveError}
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
          pushEventPreferences={form.pushEventPreferences}
          onSubscribe={handlePushSubscribe}
          onUnsubscribe={handlePushUnsubscribe}
          onToggleEventPreference={handleTogglePushEvent}
        />
      </div>
    </div>
  );
}
