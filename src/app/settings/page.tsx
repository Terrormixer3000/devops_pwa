"use client";

import { useState, useEffect } from "react";
import { AppBar } from "@/components/layout/AppBar";
import { Button } from "@/components/ui/Button";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { AppSettings } from "@/types";
import { Eye, EyeOff, CheckCircle, Trash2, ExternalLink } from "lucide-react";
import { createAzureClient } from "@/lib/api/client";
import { demoSettings } from "@/lib/mocks/demoData";

export default function SettingsPage() {
  const { settings, setSettings, clearSettings } = useSettingsStore();

  // Formular-Zustand
  const [form, setForm] = useState<AppSettings>({
    organization: "",
    project: "",
    pat: "",
    demoMode: false,
  });
  const [showPat, setShowPat] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState("");
  const [saved, setSaved] = useState(false);

  // Gespeicherte Einstellungen in Formular laden
  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Testergebnis zuruecksetzen bei Aenderung
    setTestResult(null);
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
      setForm({ organization: "", project: "", pat: "", demoMode: false });
    }
  };

  const isFormValid = form.demoMode || (form.organization && form.project && form.pat);

  return (
    <div className="min-h-screen">
      <AppBar title="Einstellungen" />

      <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Azure DevOps Konfiguration */}
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
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
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
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
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
                className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono"
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
            disabled={!isFormValid}
            onClick={handleTest}
          >
            Verbindung testen
          </Button>
          <Button
            fullWidth
            disabled={!isFormValid}
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

        {/* Info-Box */}
        <div className="p-4 bg-slate-800/50 rounded-xl space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Datenschutz</p>
          <p className="text-xs text-slate-500">
            Dein PAT wird ausschliesslich lokal im Browser gespeichert und niemals an externe Server uebertragen.
          </p>
        </div>
      </div>
    </div>
  );
}
