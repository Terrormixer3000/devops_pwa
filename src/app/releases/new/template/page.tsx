"use client";

/**
 * Template-Picker fuer neue Release-Pipeline-Stages.
 * Zeigt vordefinierte Stage-Templates (Leer, Bash, App Service, etc.) zur Auswahl an.
 * Fuegt die gewaehlte Stage in den releaseCreationStore ein und navigiert zum Stage-Editor.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppBar } from "@/components/layout/AppBar";
import { STAGE_TEMPLATES } from "@/lib/constants/releaseTasks";
import { useReleaseCreationStore } from "@/lib/stores/releaseCreationStore";

/** Seite zum Auswaehlen eines Stage-Templates beim Hinzufuegen einer neuen Stage. */
export default function StageTemplatePage() {
  const router = useRouter();
  const { draft, addStage } = useReleaseCreationStore();
  const t = useTranslations("stageTemplate");
  const tCreate = useTranslations("createReleasePipeline");

  // Ohne Draft gibt es nichts zu tun – zurueck zur Hauptseite
  useEffect(() => {
    if (!draft) router.replace("/releases/new");
  }, [draft, router]);

  const BackTitle = (
    <button
      onClick={() => router.push("/releases/new")}
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      {tCreate("title")}
    </button>
  );

  const handleSelect = (templateId: string) => {
    if (!draft) return;

    const template = STAGE_TEMPLATES.find((tmpl) => tmpl.id === templateId);
    if (!template) return;

    // Standardname: "Stage N" basierend auf aktueller Anzahl
    const stageName = `Stage ${draft.stages.length + 1}`;
    const newIndex = draft.stages.length;

    addStage({ name: stageName, ...template.stage });
    router.push(`/releases/new/stage?index=${newIndex}`);
  };

  if (!draft) return null;

  return (
    <div className="min-h-screen">
      <AppBar title={BackTitle} hideProjectChip />

      <div className="mx-auto max-w-2xl px-4 pb-8 pt-4">
        <p className="mb-4 text-sm text-slate-400">{t("description")}</p>

        <div className="divide-y divide-slate-800/50 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/30">
          {STAGE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template.id)}
              className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-700/30 active:bg-slate-700/50"
            >
              {/* Icon-Placeholder */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700/60 text-lg text-slate-300">
                {template.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{template.label}</p>
                <p className="text-xs text-slate-500">{template.description}</p>
                {template.stage.tasks.length > 0 && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {t("tasksPreconfigured", { count: template.stage.tasks.length })}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="shrink-0 text-slate-600" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
