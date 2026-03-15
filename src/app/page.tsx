"use client";

// Startseite: Landing Page fuer nicht-eingeloggte Nutzer, Redirect fuer eingeloggte
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Zap, Eye, HardDrive, Shield, ArrowRight } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settingsStore";

export default function Home() {
  const { isConfigured, loaded } = useSettingsStore();
  const router = useRouter();
  const t = useTranslations("intro");

  // Sobald Einstellungen geladen: konfigurierte Nutzer direkt zum Dashboard
  useEffect(() => {
    if (loaded && isConfigured) {
      router.replace("/dashboard");
    }
  }, [loaded, isConfigured, router]);

  // Warten bis localStorage geladen – leerer Screen verhindert Flackern
  if (!loaded) return null;

  // Konfigurierter Nutzer: Redirect laeuft, nichts anzeigen
  if (isConfigured) return null;

  return (
    <div className="min-h-screen bg-slate-950 max-w-md mx-auto px-5 pb-8 pt-8">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-5">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M20 4L36 14V26L20 36L4 26V14L20 4Z"
              fill="#2563EB"
              fillOpacity="0.3"
              stroke="#3B82F6"
              strokeWidth="1.5"
            />
            <path d="M13 20L18 25L27 15" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Azure DevOps Mobile</h1>
        <p className="text-slate-400 text-base leading-relaxed">{t("tagline")}</p>
      </div>

      {/* Wie funktioniert die App */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {t("howTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <FeatureRow icon={<Zap size={18} className="text-blue-400" />} title={t("how1Title")} desc={t("how1Desc")} />
          <FeatureRow icon={<Eye size={18} className="text-blue-400" />} title={t("how2Title")} desc={t("how2Desc")} />
          <FeatureRow icon={<HardDrive size={18} className="text-blue-400" />} title={t("how3Title")} desc={t("how3Desc")} />
        </div>
      </section>

      {/* Einrichtung */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          {t("setupTitle")}
        </h2>
        <div className="flex flex-col gap-3">
          <SetupStep number={1} text={t("step1")} />
          <SetupStep number={2} text={t("step2")} />
          <SetupStep number={3} text={t("step3")} />
        </div>
      </section>

      {/* Datenschutz */}
      <section className="mb-10">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-green-400 shrink-0" />
            <span className="text-sm font-semibold text-slate-200">{t("privacyTitle")}</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{t("privacyDesc")}</p>
        </div>
      </section>

      {/* CTA */}
      <Link
        href="/settings"
        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        {t("cta")}
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}

// Hilfskompnente: Feature-Zeile mit Icon, Titel und Beschreibung
function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// Hilfskomponente: nummerierter Einrichtungsschritt
function SetupStep({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-600/40 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-blue-400">{number}</span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}
