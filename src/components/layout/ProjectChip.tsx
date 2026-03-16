"use client";

/**
 * ProjectChip: Kleiner Projekt-Indikator in der AppBar.
 * Nur sichtbar wenn mehr als ein Projekt gespeichert ist.
 * Tippen oeffnet ein Sheet zum Wechsel des aktiven Projekts.
 */

import { useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { Drawer } from "vaul";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "@/lib/stores/settingsStore";

export function ProjectChip() {
  const { settings, setSettings } = useSettingsStore();
  const queryClient = useQueryClient();
  const t = useTranslations("settings");
  const [open, setOpen] = useState(false);

  const availableProjects = settings?.availableProjects ?? [];
  // Im Demo-Modus oder wenn nur ein Projekt vorhanden: Chip ausblenden
  if (!settings || settings.demoMode || availableProjects.length <= 1) return null;

  const activeProject = settings.project;

  const handleSelect = (project: string) => {
    if (project === activeProject) { setOpen(false); return; }
    setSettings({ ...settings, project });
    // Alle Queries nach Projektwechsel invalidieren
    void queryClient.invalidateQueries();
    setOpen(false);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      direction="bottom"
      modal={true}
      noBodyStyles={true}
      handleOnly={true}
      repositionInputs={false}
      shouldScaleBackground={false}
    >
      <Drawer.Trigger asChild>
        <button
          className="flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors mt-0.5 max-w-[180px]"
          aria-label={t("projectSwitcher")}
        >
          <span className="truncate">{activeProject}</span>
          <ChevronDown size={10} className="flex-shrink-0" />
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md" />
        <Drawer.Content
          className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] border border-slate-700/70 bg-slate-900 shadow-[0_-14px_40px_rgba(0,0,0,0.34)]"
          style={{ maxHeight: "calc(var(--selection-sheet-max-height) + var(--bottom-nav-height))" }}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-slate-500/80" />
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
            <Drawer.Title className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">
              {t("projectSwitcher")}
            </Drawer.Title>
            <Drawer.Close asChild>
              <button className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition-colors hover:bg-slate-700/80">
                <X size={16} />
              </button>
            </Drawer.Close>
          </div>
          <Drawer.Description className="sr-only">
            {t("projectSwitcher")}
          </Drawer.Description>

          <div
            className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-800/50"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom-effective))" }}
          >
            {availableProjects.map((project) => {
              const isActive = project === activeProject;
              return (
                <button
                  key={project}
                  onClick={() => handleSelect(project)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-800/40 ${isActive ? "bg-blue-950/20" : ""}`}
                >
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isActive ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                    {isActive && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? "text-slate-100" : "text-slate-300"}`}>
                    {project}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-[11px] text-blue-400">{t("activeProject")}</span>
                  )}
                </button>
              );
            })}
            <div className="h-8" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
