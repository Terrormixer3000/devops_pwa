"use client";

/**
 * Einstellungen-Seite: Verwaltung der Azure-DevOps-Verbindungsparameter
 * (URL, Token, Organisation, Projekt) sowie App-weiter Optionen wie Demo-Modus.
 */

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { AppSettings, ThemeMode } from "@/types";
import { Eye, EyeOff, CheckCircle, Trash2, ExternalLink, Bell, BellOff, AlertCircle, FlaskConical, ListChecks, ChevronRight } from "lucide-react";
import { createAzureClient } from "@/lib/api/client";
import { demoSettings } from "@/lib/mocks/demoData";
import { identityService, type AzureCurrentUser } from "@/lib/services/identityService";
import { pushService, type PushPermissionState, type PushSupportStatus } from "@/lib/services/pushService";

const EMPTY_SETTINGS: AppSettings = {
  organization: "",
  project: "",
  pat: "",
  demoMode: false,
  theme: "dark",
};

/** Einstellungsformular zum Konfigurieren der Azure-DevOps-Verbindung und App-Optionen. */
export default function SettingsPage() {
  const { settings, setSettings, clearSettings } = useSettingsStore();
  const queryClient = useQueryClient();

  // Formular-Zustand
  const [form, setForm] = useState<AppSettings>(EMPTY_SETTINGS);
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState("");
  const [saved, setSaved] = useState(false);

  // Notification-State
  const [pushSupportStatus, setPushSupportStatus] = useState<PushSupportStatus>("unsupported");
  const [permissionState, setPermissionState] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");
  const [currentUser, setCurrentUser] = useState<AzureCurrentUser | null>(null);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);

  // Gespeicherte Einstellungen in Formular laden
  useEffect(() => {
    setForm(settings || EMPTY_SETTINGS);
  }, [settings]);

  // Push-Notification Status beim Laden ermitteln
  const refreshPushState = useCallback(async () => {
    const status = pushService.getSupportStatus();
    setPushSupportStatus(status);
    if (status === "supported") {
      setPermissionState(pushService.getPermissionState());
      try {
        const existing = await pushService.getExistingSubscription();
        setIsSubscribed(!!existing);
      } catch {
        setIsSubscribed(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  useEffect(() => {
    setWebhookToken(pushService.getStoredToken());
  }, []);

  useEffect(() => {
    const org = form.organization || settings?.organization;
    const project = form.project || settings?.project;
    const pat = form.pat || settings?.pat;
    const demoMode = form.demoMode ?? settings?.demoMode ?? false;

    if (!org || !project || (!pat && !demoMode)) {
      setCurrentUser(null);
      return;
    }

    const client = createAzureClient({
      organization: org,
      project,
      pat: pat || "",
      demoMode,
      theme: form.theme,
    });

    identityService
      .getCurrentUser(client)
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, [form.demoMode, form.organization, form.pat, form.project, form.theme, settings]);

  useEffect(() => {
    // Theme-Wechsel in den Einstellungen sofort als Vorschau anwenden.
    document.documentElement.dataset.theme = form.theme;
    document.documentElement.style.colorScheme = form.theme;
  }, [form.theme]);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Testergebnis zuruecksetzen bei Aenderung
    setTestResult(null);
    setSaved(false);
  };

  // Das Theme wird direkt in den App-Einstellungen persistiert und global angewendet.
  const handleThemeChange = (theme: ThemeMode) => {
    setForm((prev) => ({ ...prev, theme }));
    setSaved(false);
  };

  // Der Demo-Modus fuellt sinnvolle Defaults vor und deaktiviert die echten Zugangsdaten.
  const handleDemoToggle = () => {
    setForm((prev) => ({
      ...prev,
      demoMode: !prev.demoMode,
      organization: prev.demoMode ? prev.organization : prev.organization || demoSettings.organization,
      project: prev.demoMode ? prev.project : prev.project || demoSettings.project,
    }));
    setTestResult(null);
    setSaved(false);
  };

  // Verbindungstest mit der Azure DevOps API
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    try {
      if (form.demoMode) {
        setTestResult("success");
        return;
      }
      const client = createAzureClient(form);
      await client.get(`/${form.project}/_apis/git/repositories?api-version=7.1&$top=1`);
      setTestResult("success");
    } catch (err) {
      setTestResult("error");
      setTestError(err instanceof Error ? err.message : "Verbindung fehlgeschlagen");
    } finally {
      setTesting(false);
    }
  };

  // Einstellungen speichern
  const handleSave = () => {
    // Im Demo-Modus werden Organisation und Projekt immer auf die Demo-Werte normalisiert.
    const normalized: AppSettings = form.demoMode
      ? {
          ...form,
          organization: form.organization || demoSettings.organization,
          project: form.project || demoSettings.project,
        }
      : form;
    setSettings(normalized);
    setForm(normalized);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Alle Einstellungen loeschen
  const handleClear = () => {
    if (confirm("Alle Einstellungen loeschen?")) {
      clearSettings();
      setForm(EMPTY_SETTINGS);
      setShowPat(false);
      setTestResult(null);
      setTestError("");
      setSaved(false);
      queryClient.clear();
    }
  };

  // Push-Notifications aktivieren
  const handlePushSubscribe = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      const subscription = await pushService.subscribe();
      if (!currentUser) {
        throw new Error("Azure DevOps Benutzer konnte nicht ermittelt werden. Bitte zuerst Verbindung testen.");
      }
      await pushService.registerSubscription(
        subscription,
        form.organization || settings?.organization || "",
        form.project || settings?.project || "",
        currentUser.id,
        currentUser.displayName
      );
      await refreshPushState();
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Aktivierung fehlgeschlagen");
    } finally {
      setPushLoading(false);
    }
  };

  // Push-Notifications deaktivieren
  const handlePushUnsubscribe = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      await pushService.unsubscribe();
      await refreshPushState();
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Deaktivierung fehlgeschlagen");
    } finally {
      setPushLoading(false);
    }
  };

  const canTestConnection = form.demoMode || !!(form.organization && form.project && form.pat);

  return (
    <div className="min-h-screen">
      <AppBar title="Einstellungen" />

      <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Azure DevOps Konfiguration */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Darstellung
          </h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Farbschema</p>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800/70 p-1.5">
              {[
                { value: "dark", label: "Dark Mode" },
                { value: "light", label: "Light Mode" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleThemeChange(option.value as ThemeMode)}
                  className={`rounded-[0.95rem] px-4 py-3 text-sm font-medium transition-colors ${
                    form.theme === option.value
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-700/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Azure DevOps Konfiguration
          </h2>

          <div className="flex items-start justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">Demo Modus</p>
              <p className="text-xs text-slate-500">
                Aktiviert ein Mock-Projekt mit 30 Repositories, Pipelines, Releases, Branches, Commits und PR-Konversationen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDemoToggle}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form.demoMode ? "bg-blue-600" : "bg-slate-700"}`}
              aria-pressed={form.demoMode}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.demoMode ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Organisation */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Organisation</label>
            <input
              type="text"
              value={form.organization}
              onChange={(e) => handleChange("organization", e.target.value)}
              placeholder="z.B. meine-firma"
              disabled={form.demoMode}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-slate-500">
              dev.azure.com/<strong className="text-slate-400">{form.organization || "organisation"}</strong>
            </p>
          </div>

          {/* Standardprojekt */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Standardprojekt</label>
            <input
              type="text"
              value={form.project}
              onChange={(e) => handleChange("project", e.target.value)}
              placeholder="z.B. mein-projekt"
              disabled={form.demoMode}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Personal Access Token */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Personal Access Token (PAT)</label>
            <div className="relative">
              <input
                type={showPat ? "text" : "password"}
                value={form.pat}
                onChange={(e) => handleChange("pat", e.target.value)}
                placeholder="Token eingeben..."
                disabled={form.demoMode}
                className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono"
              />
              {/* Token anzeigen/verbergen */}
              <button
                type="button"
                onClick={() => setShowPat(!showPat)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200"
              >
                {showPat ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {form.demoMode
                ? "Im Demo Modus werden keine echten Zugangsdaten benoetigt."
                : "Benoetigt: Code (read), Pull Requests (read & write), Build (read & execute)"}
            </p>
          </div>
        </section>

        {/* PAT erstellen Link */}
        {!form.demoMode && (
          <a
            href="https://dev.azure.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink size={14} />
            PAT in Azure DevOps erstellen
          </a>
        )}

        {/* Datenschutz-Hinweis direkt bei den Zugangsdaten */}
        <div className="p-4 bg-slate-800/50 rounded-xl space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Datenschutz</p>
          <p className="text-xs text-slate-500">
            Dein PAT wird ausschliesslich lokal im Browser gespeichert und niemals an externe Server uebertragen.
          </p>
        </div>

        {/* Testergebnis anzeigen */}
        {testResult === "success" && (
          <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700/50 rounded-xl">
            <CheckCircle size={18} className="text-green-400" />
            <p className="text-sm text-green-300">
              {form.demoMode ? "Demo-Daten erfolgreich aktiviert!" : "Verbindung erfolgreich!"}
            </p>
          </div>
        )}
        {testResult === "error" && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
            <p className="text-sm text-red-300">{testError}</p>
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-xl">
            <CheckCircle size={18} className="text-blue-400" />
            <p className="text-sm text-blue-300">Einstellungen gespeichert</p>
          </div>
        )}

        {/* Aktionsknopfe */}
        <div className="space-y-3">
          <Button
            fullWidth
            variant="secondary"
            loading={testing}
            disabled={!canTestConnection}
            onClick={handleTest}
          >
            Verbindung testen
          </Button>
          <Button
            fullWidth
            onClick={handleSave}
          >
            Einstellungen speichern
          </Button>
          {settings && (
            <Button
              fullWidth
              variant="danger"
              onClick={handleClear}
            >
              <Trash2 size={16} />
              Einstellungen loeschen
            </Button>
          )}
        </div>

        {/* Benachrichtigungen */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Benachrichtigungen
          </h2>

          {!webhookToken ? (
            // Noch nicht per Wizard eingerichtet
            <a
              href="/push-setup"
              className="flex items-center gap-3 p-4 bg-slate-800/50 border border-blue-700/30 rounded-xl transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
            >
              <Bell size={18} className="text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">Push-Notifications einrichten</p>
                <p className="text-xs text-slate-500">Bitte den Einrichtungs-Wizard durchlaufen</p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 text-slate-500" />
            </a>
          ) : (<>

          {/* Praeziser Status-Hinweis je nach Support-Level */}
          {pushSupportStatus === "unsupported" && (
            <div className="flex items-start gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
              <BellOff size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-400">Nicht unterstuetzt</p>
                <p className="text-xs text-slate-500">
                  Dieser Browser unterstuetzt keine Push-Benachrichtigungen.
                </p>
              </div>
            </div>
          )}

          {pushSupportStatus === "needs-https" && (
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
          )}

          {pushSupportStatus === "needs-pwa-install" && (
            <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-300">PWA-Installation erforderlich</p>
                <p className="text-xs text-amber-400/80">
                  Push-Benachrichtigungen funktionieren nur wenn die App ueber &quot;Zum Home-Bildschirm
                  hinzufuegen&quot; installiert wurde (ab iOS 16.4).
                </p>
              </div>
            </div>
          )}

          {pushSupportStatus === "needs-service-worker" && (
            <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-300">Service Worker nicht aktiv</p>
                <p className="text-xs text-amber-400/80">
                  In der aktuellen Umgebung ist kein Push-faehiger Service Worker aktiv.
                  Bitte <span className="font-mono">/sw.js</span> pruefen, Hard-Reload ausfuehren
                  und falls noetig den Browser-Cache bzw. alte Service Worker entfernen.
                </p>
              </div>
            </div>
          )}

          {/* Erlaubnis verweigert */}
          {pushSupportStatus === "supported" && permissionState === "denied" && (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/40 rounded-xl">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-300">Erlaubnis verweigert</p>
                <p className="text-xs text-red-400/80">
                  Notifications wurden blockiert. Bitte in den Browser-Einstellungen wieder erlauben.
                </p>
              </div>
            </div>
          )}

          {/* Haupt-Toggle */}
          {pushSupportStatus === "supported" && permissionState !== "denied" && (
            <div className="flex items-start justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-start gap-3">
                {isSubscribed
                  ? <Bell size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  : <BellOff size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
                }
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Push-Benachrichtigungen</p>
                  <p className="text-xs text-slate-500">
                    {isSubscribed ? "Aktiv — du wirst bei relevanten Events benachrichtigt" : "Deaktiviert"}
                  </p>
                  {currentUser && (
                    <p className="text-[11px] text-slate-500">
                      Zuordnung: {currentUser.displayName} · {currentUser.id}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={isSubscribed ? handlePushUnsubscribe : handlePushSubscribe}
                disabled={pushLoading || (!form.organization && !settings?.organization)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${
                  isSubscribed ? "bg-blue-600" : "bg-slate-700"
                }`}
                aria-pressed={isSubscribed}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    isSubscribed ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Fehlermeldung */}
          {pushError && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
              <p className="text-sm text-red-300">{pushError}</p>
            </div>
          )}

          {/* Event-Liste (informativ) */}
          {pushSupportStatus === "supported" && isSubscribed && (
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl space-y-2">
              <p className="text-xs font-medium text-slate-400">Benachrichtigungen bei:</p>
              {[
                "PR-Review-Anfrage",
                "Build fehlgeschlagen",
                "Build erfolgreich",
                "Release-Approval ausstehend",
                "PR-Kommentar",
              ].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-blue-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          )}
          </>)}
        </section>

        {/* Wizard */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Einrichtung
          </h2>
          <a
            href="/push-setup"
            className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
          >
            <ListChecks size={18} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">Push-Wizard starten</p>
              <p className="text-xs text-slate-500">Schritt-fuer-Schritt Setup fuer Push Notifications</p>
            </div>
            <ExternalLink size={14} className="flex-shrink-0 text-slate-600" />
          </a>
        </section>

        {/* Admin-Bereich */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Entwickler
          </h2>
          <a
            href="/push-test"
            className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl transition-colors hover:bg-slate-700/60 active:scale-[0.99]"
          >
            <FlaskConical size={18} className="text-purple-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">Push-Notifications testen</p>
              <p className="text-xs text-slate-500">Notifications aktivieren und Events simulieren</p>
            </div>
            <ExternalLink size={14} className="flex-shrink-0 text-slate-600" />
          </a>
        </section>
      </div>
    </div>
  );
}
