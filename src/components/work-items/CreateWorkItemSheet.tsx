"use client";

/**
 * Sheet zum Erstellen eines neuen Work Items.
 * Erlaubt Auswahl von Typ, Titel und optionaler Beschreibung.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { workItemsService } from "@/lib/services/workItemsService";

/** Verfuegbare Work-Item-Typen. */
const WORK_ITEM_TYPES = ["Task", "Bug", "User Story", "Feature"] as const;
type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

/** Props fuer das CreateWorkItemSheet. */
interface Props {
  open: boolean;
  onClose: () => void;
}

/** Bottom-Sheet zum Erstellen eines neuen Work Items. */
export function CreateWorkItemSheet({ open, onClose }: Props) {
  const t = useTranslations("workItems");
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();

  const [type, setType] = useState<WorkItemType>("Task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) throw new Error("Kein Client");
      return workItemsService.createWorkItem(client, settings.project, type, title.trim(), description.trim() || undefined);
    },
    onSuccess: (newItem) => {
      void qc.invalidateQueries({ queryKey: ["work-items"] });
      handleClose();
      router.push(`/work-items/${newItem.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const reset = () => {
    setType("Task");
    setTitle("");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isDisabled = !title.trim() || createMutation.isPending;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(v) => { if (!v) handleClose(); }}
      direction="bottom"
      modal={true}
      noBodyStyles={true}
      handleOnly={true}
      repositionInputs={false}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md" />
        <Drawer.Content className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] border border-slate-700/70 bg-slate-900 shadow-[0_-14px_40px_rgba(0,0,0,0.34)]" style={{ maxHeight: "90dvh" }}>
          {/* Griff */}
          <div className="flex justify-center pt-2.5 pb-1">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-slate-500/80" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
            <Drawer.Title className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">
              {t("createWorkItem")}
            </Drawer.Title>
            <Drawer.Close asChild>
              <button className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition-colors hover:bg-slate-700/80">
                <X size={16} />
              </button>
            </Drawer.Close>
          </div>
          <Drawer.Description className="sr-only">{t("createWorkItem")}</Drawer.Description>

          {/* Formular */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4" style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom-effective) + 1rem)" }}>
            {/* Typ-Auswahl */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">{t("type")}</label>
              <div className="flex gap-2 flex-wrap">
                {WORK_ITEM_TYPES.map((wt) => (
                  <button
                    key={wt}
                    onClick={() => setType(wt)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      type === wt
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>

            {/* Titel */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                {t("titleLabel")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("newWorkItem")}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/70"
              />
              {!title.trim() && title.length > 0 && (
                <p className="text-xs text-red-400 mt-1">{t("titleRequired")}</p>
              )}
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">{t("description")}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("noDescription")}
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/70"
              />
            </div>

            {/* Fehleranzeige */}
            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Submit-Button */}
            <button
              onClick={() => createMutation.mutate()}
              disabled={isDisabled}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 transition-opacity hover:bg-blue-500 active:bg-blue-700"
            >
              {createMutation.isPending ? "…" : t("createWorkItem")}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
