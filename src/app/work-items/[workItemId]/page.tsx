"use client";

/**
 * Work-Item-Detailseite: Zeigt alle Details eines einzelnen Work Items
 * mit Status-Verwaltung, Beschreibung und Kommentaren.
 */

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Drawer } from "vaul";
import { AppBar } from "@/components/layout/AppBar";
import { TabBar } from "@/components/ui/TabBar";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useWorkItemDetail } from "@/lib/hooks/useWorkItemDetail";
import { timeAgo } from "@/lib/utils/timeAgo";
import {
  ChevronLeft,
  MessageCircle,
  Info,
  Check,
  Send,
  X,
} from "lucide-react";

/** Gibt ein farb-codiertes Status-Badge fuer den Work-Item-Status zurueck. */
function StateBadge({ state }: { state: string }) {
  if (state === "Active") return <Badge variant="info" size="sm">{state}</Badge>;
  if (state === "New") return <Badge variant="muted" size="sm">{state}</Badge>;
  if (state === "Resolved") return <Badge variant="success" size="sm">{state}</Badge>;
  if (state === "Closed") return <Badge variant="muted" size="sm">{state}</Badge>;
  return <Badge variant="muted" size="sm">{state}</Badge>;
}

/** Gibt ein Badge fuer den Work-Item-Typen zurueck. */
function TypeBadge({ type }: { type: string }) {
  const t = type?.toLowerCase();
  if (t === "bug") return <Badge variant="danger" size="sm">{type}</Badge>;
  if (t === "user story") return <Badge variant="info" size="sm">{type}</Badge>;
  if (t === "feature") return <Badge variant="warning" size="sm">{type}</Badge>;
  if (t === "epic") return <Badge variant="warning" size="sm">{type}</Badge>;
  return <Badge variant="muted" size="sm">{type}</Badge>;
}

const WORK_ITEM_STATES = ["New", "Active", "Resolved", "Closed"];

/** Work-Item-Detailseite. */
export default function WorkItemDetailPage({ params }: { params: Promise<{ workItemId: string }> }) {
  const { workItemId } = use(params);
  const workItemIdNum = parseInt(workItemId);
  const router = useRouter();
  const t = useTranslations("workItems");

  const h = useWorkItemDetail(workItemIdNum);

  const BackButton = (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      {t("title")}
    </button>
  );

  if (h.isLoading) return <div className="min-h-screen"><AppBar title={BackButton} /><PageLoader /></div>;
  if (h.error || !h.workItem) return <div className="min-h-screen"><AppBar title={BackButton} /><ErrorMessage message={t("loadError")} error={h.error} /></div>;

  const item = h.workItem;
  const title = item.fields["System.Title"];
  const state = item.fields["System.State"];
  const type = item.fields["System.WorkItemType"];
  const assignedTo = item.fields["System.AssignedTo"];
  const createdDate = item.fields["System.CreatedDate"];
  const changedDate = item.fields["System.ChangedDate"];
  const description = item.fields["System.Description"];
  const priority = item.fields["Microsoft.VSTS.Common.Priority"];

  const tabs = [
    { key: "overview", label: t("detail"), icon: <Info size={14} /> },
    { key: "comments", label: t("comments"), icon: <MessageCircle size={14} /> },
  ];

  return (
    <div className="min-h-screen">
      <AppBar title={BackButton} />

      {/* Kopfbereich: ID, Typ, Titel */}
      <div className="px-4 pb-4 border-b border-slate-800 pt-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-mono text-slate-500">#{item.id}</span>
          <TypeBadge type={type} />
          <StateBadge state={state} />
          {priority && priority <= 3 && (
            <span className={`text-[10px] font-medium ${priority === 1 ? "text-red-400" : priority === 2 ? "text-yellow-400" : "text-slate-400"}`}>
              P{priority}
            </span>
          )}
        </div>
        <h1 className="text-base font-semibold text-slate-100 leading-snug">{title}</h1>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={tabs}
        activeKey={h.activeTab}
        onChange={(key) => h.setActiveTab(key as "overview" | "comments")}
        variant="underline"
      />

      {/* Tab-Inhalt */}
      <div>
        {h.activeTab === "overview" && (
          <div className="divide-y divide-slate-800/50">
            {/* Status-Zeile */}
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">{t("state")}</span>
              <div className="flex items-center gap-2">
                <StateBadge state={state} />
                <button
                  onClick={() => h.setStateSheetOpen(true)}
                  className="text-xs text-blue-400 px-2 py-1 rounded-md bg-blue-950/30 hover:bg-blue-950/50 transition-colors"
                >
                  {t("changeState")}
                </button>
              </div>
            </div>

            {/* Zugewiesene Person */}
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">{t("assignee")}</span>
              <span className="text-sm text-slate-200">
                {assignedTo ? assignedTo.displayName : t("notAssigned")}
              </span>
            </div>

            {/* Prioritaet */}
            {priority != null && (
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">{t("priority")}</span>
                <span className={`text-sm font-medium ${priority === 1 ? "text-red-400" : priority === 2 ? "text-yellow-400" : "text-slate-300"}`}>
                  P{priority}
                </span>
              </div>
            )}

            {/* Erstellt */}
            {createdDate && (
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">{t("created")}</span>
                <span className="text-sm text-slate-300">{timeAgo(createdDate)}</span>
              </div>
            )}

            {/* Geaendert */}
            {changedDate && (
              <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-400">{t("modified")}</span>
                <span className="text-sm text-slate-300">{timeAgo(changedDate)}</span>
              </div>
            )}

            {/* Beschreibung */}
            <div className="px-4 py-3.5">
              <p className="text-sm text-slate-400 mb-2">{t("description")}</p>
              {description ? (
                <div
                  className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : (
                <p className="text-sm text-slate-500 italic">{t("noDescription")}</p>
              )}
            </div>
          </div>
        )}

        {h.activeTab === "comments" && (
          <div className="flex flex-col">
            {/* Kommentar-Liste */}
            <div className="divide-y divide-slate-800/50">
              {!h.comments || h.comments.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">{t("noComments")}</div>
              ) : (
                h.comments.map((comment) => (
                  <div key={comment.id} className="px-4 py-3.5">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-300">{comment.createdBy.displayName}</span>
                      <span className="text-xs text-slate-500">{timeAgo(comment.createdDate)}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Neuer Kommentar */}
            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={h.commentText}
                  onChange={(e) => h.setCommentText(e.target.value)}
                  placeholder={t("addComment")}
                  rows={2}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/70"
                />
                <button
                  onClick={() => h.addCommentMutation.mutate()}
                  disabled={!h.commentText.trim() || h.addCommentMutation.isPending}
                  className="flex-shrink-0 p-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40 transition-opacity"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status-Auswahl-Sheet */}
      <Drawer.Root
        open={h.stateSheetOpen}
        onOpenChange={h.setStateSheetOpen}
        direction="bottom"
        modal={true}
        noBodyStyles={true}
        handleOnly={true}
        repositionInputs={false}
        shouldScaleBackground={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md" />
          <Drawer.Content className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] border border-slate-700/70 bg-slate-900 shadow-[0_-14px_40px_rgba(0,0,0,0.34)]">
            <div className="flex justify-center pt-2.5 pb-1">
              <Drawer.Handle className="h-1.5 w-10 rounded-full bg-slate-500/80" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
              <Drawer.Title className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">
                {t("changeState")}
              </Drawer.Title>
              <Drawer.Close asChild>
                <button className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition-colors hover:bg-slate-700/80">
                  <X size={16} />
                </button>
              </Drawer.Close>
            </div>
            <Drawer.Description className="sr-only">{t("changeState")}</Drawer.Description>
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-800/50" style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom-effective))" }}>
              {WORK_ITEM_STATES.map((s) => {
                const isActive = s === state;
                return (
                  <button
                    key={s}
                    onClick={() => h.updateStateMutation.mutate(s)}
                    disabled={h.updateStateMutation.isPending}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-800/40 ${isActive ? "bg-blue-950/20" : ""}`}
                  >
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isActive ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                      {isActive && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <StateBadge state={s} />
                  </button>
                );
              })}
              <div className="h-8" />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
