"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle, ExternalLink, Trash2, Plus, Search, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { demoSettings } from "@/lib/mocks/demoData";
import type { AppSettings, ThemeMode, Locale } from "@/types";

interface ConnectionSettingsProps {
  form: AppSettings;
  showPat: boolean;
  testing: boolean;
  testResult: "success" | "error" | null;
  testError: string;
  saveError: string;
  canTest: boolean;
  hasExistingSettings: boolean;
  availableProjects: string[];
  discoveringProjects: boolean;
  discoveredProjects: string[];
  onChangeField: (field: keyof AppSettings, value: string) => void;
  onToggleShowPat: () => void;
  onToggleDemoMode: () => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeLocale: (locale: Locale) => void;
  onAddProject: (name: string) => void;
  onRemoveProject: (name: string) => void;
  onSetActiveProject: (name: string) => void;
  onDiscoverProjects: () => void;
  onTest: () => void;
  onClear: () => void;
}

/** Sektion für Darstellungs- und Azure-DevOps-Verbindungseinstellungen. */
export function ConnectionSettings({
  form, showPat, testing, testResult, testError, saveError,
  canTest, hasExistingSettings,
  availableProjects, discoveringProjects, discoveredProjects,
  onChangeField, onToggleShowPat, onToggleDemoMode, onChangeTheme, onChangeLocale,
  onAddProject, onRemoveProject, onSetActiveProject, onDiscoverProjects,
  onTest, onClear,
}: ConnectionSettingsProps) {
  const t = useTranslations("settings");
  const [manualProjectInput, setManualProjectInput] = useState("");

  return (
    <>
      {/* Darstellung */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("theme")}</h2>

        <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 divide-y divide-slate-700/60">
          {/* Farbschema */}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm font-medium text-slate-300">{t("colorScheme")}</p>
            <div className="flex gap-1 rounded-xl bg-slate-800/80 p-1">
              {[
                { value: "dark", label: t("darkMode") },
                { value: "light", label: t("lightMode") },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChangeTheme(option.value as ThemeMode)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.theme === option.value ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sprache */}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm font-medium text-slate-300">{t("language")}</p>
            <div className="flex gap-1 rounded-xl bg-slate-800/80 p-1">
              {([
                { loc: "de", label: "Deutsch" },
                { loc: "en", label: "English" },
              ] as { loc: Locale; label: string }[]).map(({ loc, label }) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => onChangeLocale(loc)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    (form.locale ?? "de") === loc ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Azure DevOps Konfiguration */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("azureConfig")}</h2>

        <div className="flex items-start justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-200">{t("demoMode")}</p>
            <p className="text-xs text-slate-500">
              {t("demoModeDesc")}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDemoMode}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form.demoMode ? "bg-blue-600" : "bg-slate-700"}`}
            aria-pressed={form.demoMode}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.demoMode ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">{t("organization")}</label>
          <input
            type="text"
            value={form.organization}
            onChange={(e) => onChangeField("organization", e.target.value)}
            placeholder={t("organizationPlaceholder")}
            disabled={form.demoMode}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-slate-500">
            dev.azure.com/<strong className="text-slate-400">{form.organization || "organisation"}</strong>
          </p>
        </div>

        {/* Projekt-Liste */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">{t("projects")}</label>

          {/* Gespeicherte Projekte (im Demo-Modus: Demo-Projekt anzeigen) */}
          {(form.demoMode ? [demoSettings.project] : availableProjects).length > 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 divide-y divide-slate-700/60">
              {(form.demoMode ? [demoSettings.project] : availableProjects).map((proj) => {
                const isActive = proj === form.project;
                return (
                  <div key={proj} className="flex items-center gap-2 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => !form.demoMode && onSetActiveProject(proj)}
                      disabled={form.demoMode}
                      className="flex items-center gap-2 flex-1 text-left min-h-7"
                    >
                      <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isActive ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                        {isActive && <Check size={9} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-sm ${isActive ? "text-slate-100 font-medium" : "text-slate-300"}`}>{proj}</span>
                      {isActive && <span className="text-[11px] text-blue-400 ml-1">{t("activeProject")}</span>}
                    </button>
                    {!form.demoMode && availableProjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveProject(proj)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
                        aria-label={`${proj} entfernen`}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Manuell hinzufügen */}
          {!form.demoMode && (
            <div className="flex gap-2">
              <input
                type="text"
                value={manualProjectInput}
                onChange={(e) => setManualProjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualProjectInput.trim()) {
                    onAddProject(manualProjectInput.trim());
                    setManualProjectInput("");
                  }
                }}
                placeholder={t("projectPlaceholderManual")}
                className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                disabled={!manualProjectInput.trim()}
                onClick={() => {
                  if (manualProjectInput.trim()) {
                    onAddProject(manualProjectInput.trim());
                    setManualProjectInput("");
                  }
                }}
                className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-slate-100 hover:border-blue-500 transition-colors disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          {/* Projekte entdecken */}
          {!form.demoMode && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={onDiscoverProjects}
                disabled={discoveringProjects || !form.organization || !form.pat}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {discoveringProjects
                  ? <><LoadingSpinner size="sm" /><span>{t("discoveringProjects")}</span></>
                  : <><Search size={14} /><span>{t("discoverProjects")}</span></>
                }
              </button>

              {/* Entdeckte Projekte (noch nicht gespeichert) */}
              {discoveredProjects.length > 0 && (
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/20 divide-y divide-slate-700/40">
                  {discoveredProjects.map((proj) => (
                    <button
                      key={proj}
                      type="button"
                      onClick={() => { onAddProject(proj); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
                    >
                      <Plus size={13} className="text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{proj}</span>
                    </button>
                  ))}
                </div>
              )}
              {!discoveringProjects && discoveredProjects.length === 0 && discoveredProjects !== undefined && (
                // Hinweis wird nur nach einem Discover-Lauf gezeigt; leeres Array alleine genuegt nicht
                null
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Personal Access Token ({t("pat")})</label>
          <div className="relative">
            <input
              type={showPat ? "text" : "password"}
              value={form.pat}
              onChange={(e) => onChangeField("pat", e.target.value)}
              placeholder={t("patPlaceholder")}
              disabled={form.demoMode}
              className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono"
            />
            <button
              type="button"
              onClick={onToggleShowPat}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200"
            >
              {showPat ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {form.demoMode ? t("patHintDemo") : t("patHintLive")}
          </p>
        </div>
      </section>

      {!form.demoMode && (
        <a
          href="https://dev.azure.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
        >
          <ExternalLink size={14} />
          {t("createPatLink")}
        </a>
      )}

      <div className="p-4 bg-slate-800/50 rounded-xl space-y-1.5">
        <p className="text-xs font-medium text-slate-400">{t("privacyTitle")}</p>
        <p className="text-xs text-slate-500">
          {t("privacyText")}
        </p>
      </div>

      {testResult === "success" && (
        <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-700/50 rounded-xl">
          <CheckCircle size={18} className="text-green-400" />
          <p className="text-sm text-green-300">
            {form.demoMode ? t("demoSuccess") : t("connectionSuccess")}
          </p>
        </div>
      )}
      {testResult === "error" && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
          <p className="text-sm text-red-300">{testError}</p>
        </div>
      )}
      {saveError && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
          <p className="text-sm text-red-300">{saveError}</p>
        </div>
      )}

      <div className="space-y-3">
        <Button fullWidth variant="secondary" loading={testing} disabled={!canTest} onClick={onTest}>
          {testing ? t("testingConnection") : t("testConnection")}
        </Button>
        {hasExistingSettings && (
          <Button fullWidth variant="danger" onClick={onClear}>
            <Trash2 size={16} />
            {t("clearSettings")}
          </Button>
        )}
      </div>
    </>
  );
}

// Re-export for convenience in page
export { demoSettings };
