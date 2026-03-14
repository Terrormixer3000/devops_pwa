"use client";

import { Eye, EyeOff, CheckCircle, ExternalLink, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { demoSettings } from "@/lib/mocks/demoData";
import type { AppSettings, ThemeMode, Locale } from "@/types";

interface ConnectionSettingsProps {
  form: AppSettings;
  showPat: boolean;
  testing: boolean;
  testResult: "success" | "error" | null;
  testError: string;
  saved: boolean;
  canTest: boolean;
  hasExistingSettings: boolean;
  onChangeField: (field: keyof AppSettings, value: string) => void;
  onToggleShowPat: () => void;
  onToggleDemoMode: () => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeLocale: (locale: Locale) => void;
  onTest: () => void;
  onSave: () => void;
  onClear: () => void;
}

/** Sektion für Darstellungs- und Azure-DevOps-Verbindungseinstellungen. */
export function ConnectionSettings({
  form, showPat, testing, testResult, testError, saved,
  canTest, hasExistingSettings,
  onChangeField, onToggleShowPat, onToggleDemoMode, onChangeTheme, onChangeLocale, onTest, onSave, onClear,
}: ConnectionSettingsProps) {
  const t = useTranslations("settings");

  return (
    <>
      {/* Darstellung */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t("theme")}</h2>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">{t("colorScheme")}</p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800/70 p-1.5">
            {[
              { value: "dark", label: t("darkMode") },
              { value: "light", label: t("lightMode") },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChangeTheme(option.value as ThemeMode)}
                className={`rounded-[0.95rem] px-4 py-3 text-sm font-medium transition-colors ${
                  form.theme === option.value ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-700/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">{t("language")}</p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800/70 p-1.5">
            {(["de", "en"] as Locale[]).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => onChangeLocale(loc)}
                className={`rounded-[0.95rem] px-4 py-3 text-sm font-medium transition-colors ${
                  (form.locale ?? "de") === loc ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-700/80"
                }`}
              >
                {loc === "de" ? t("german") : t("english")}
              </button>
            ))}
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">{t("defaultProject")}</label>
          <input
            type="text"
            value={form.project}
            onChange={(e) => onChangeField("project", e.target.value)}
            placeholder={t("projectPlaceholder")}
            disabled={form.demoMode}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
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
      {saved && (
        <div className="flex items-center gap-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-xl">
          <CheckCircle size={18} className="text-blue-400" />
          <p className="text-sm text-blue-300">{t("settingsSaved")}</p>
        </div>
      )}

      <div className="space-y-3">
        <Button fullWidth variant="secondary" loading={testing} disabled={!canTest} onClick={onTest}>
          {testing ? t("testingConnection") : t("testConnection")}
        </Button>
        <Button fullWidth onClick={onSave}>
          {t("saveSettings")}
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
