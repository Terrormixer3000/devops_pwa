"use client";

/**
 * Work-Items-Seite: Zeigt dem angemeldeten Benutzer zugewiesene Azure Boards Work Items
 * mit Status-Filter, Sprint-Filter, Typ-Icons, Board-Ansicht und Erstellen-FAB.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TabBar } from "@/components/ui/TabBar";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { CreateWorkItemSheet } from "@/components/work-items/CreateWorkItemSheet";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { workItemsService } from "@/lib/services/workItemsService";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { WorkItem, WorkItemState } from "@/types";
import { CheckSquare, Bug, BookOpen, Zap, Layers, ListChecks, LayoutList, LayoutGrid, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

// Zustandswerte fuer die Board-Ansicht
const BOARD_STATES = ["New", "Active", "Resolved", "Closed"] as const;

/** Gibt das passende Typ-Icon fuer einen Work-Item-Typ zurueck. */
function workItemTypeIcon(type: string) {
  const t = type?.toLowerCase();
  if (t === "bug") return <Bug size={14} className="text-red-400 flex-shrink-0" />;
  if (t === "user story") return <BookOpen size={14} className="text-blue-400 flex-shrink-0" />;
  if (t === "feature") return <Zap size={14} className="text-purple-400 flex-shrink-0" />;
  if (t === "epic") return <Layers size={14} className="text-orange-400 flex-shrink-0" />;
  return <CheckSquare size={14} className="text-slate-400 flex-shrink-0" />;
}

/** Gibt ein farb-codiertes Status-Badge fuer einen Work-Item-Status zurueck. */
function workItemStateBadge(state: string, labels: Record<string, string>) {
  if (state === "Active") return <Badge variant="info" size="sm">{labels.active}</Badge>;
  if (state === "New") return <Badge variant="muted" size="sm">{labels.new}</Badge>;
  if (state === "Resolved") return <Badge variant="success" size="sm">{labels.resolved}</Badge>;
  if (state === "Closed") return <Badge variant="muted" size="sm">{labels.closed}</Badge>;
  return <Badge variant="muted" size="sm">{state}</Badge>;
}

/** Zeigt ein kurzes Prioritaets-Label (P1/P2/P3) an, wenn ein Prioritaetswert vorhanden ist. */
function priorityLabel(priority?: number) {
  if (priority === 1) return <span className="text-[10px] text-red-400 font-medium">P1</span>;
  if (priority === 2) return <span className="text-[10px] text-yellow-400 font-medium">P2</span>;
  if (priority === 3) return <span className="text-[10px] text-slate-400 font-medium">P3</span>;
  return null;
}

/** Initialen eines Anzeigenamens (max. 2 Zeichen). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Haupt-Seite fuer Work Items mit Status-Filter-Tabs und Board-Ansicht. */
export default function WorkItemsPage() {
  const [filterIdx, setFilterIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [selectedIteration, setSelectedIteration] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const t = useTranslations("workItems");

  const STATE_FILTERS: { label: string; values: WorkItemState[] | null }[] = [
    { label: t("active"), values: ["Active", "New"] },
    { label: t("resolved"), values: ["Resolved"] },
    { label: t("all"), values: null },
  ];

  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: ["work-items", settings?.project, settings?.demoMode, selectedIteration],
    queryFn: () => client && settings
      ? workItemsService.queryMyWorkItems(client, settings.project, 50, selectedIteration ?? undefined)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Sprint-Iterationen laden
  const { data: iterations } = useQuery({
    queryKey: ["work-item-iterations", settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? workItemsService.listIterations(client, settings.project)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
    staleTime: 5 * 60 * 1000,
  });

  const { pullProgress, isPulling } = usePullToRefresh({
    onRefresh: () => { void refetch(); },
    isRefreshing: isLoading,
  });

  const activeFilter = STATE_FILTERS[filterIdx];
  const filtered: WorkItem[] = (items || []).filter((item) => {
    if (!activeFilter.values) return true;
    return activeFilter.values.includes(item.fields["System.State"]);
  });

  return (
    <div className="min-h-screen">
      <AppBar
        title="Work Items"
        rightSlot={
          <div className="flex items-center gap-1">
            {/* Ansicht-Toggle: Liste / Board */}
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
              aria-label={t("list")}
            >
              <LayoutList size={18} />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "board" ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
              aria-label={t("board")}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        }
      />

      {/* Status-Filter Tabs */}
      <TabBar
        tabs={STATE_FILTERS.map((f, i) => ({
          key: String(i),
          label: i === 0 && items
            ? <>{f.label}<span className="ml-1.5 text-xs opacity-70">{items.filter((w) => ["Active", "New"].includes(w.fields["System.State"])).length}</span></>
            : f.label,
        }))}
        activeKey={String(filterIdx)}
        onChange={(key) => setFilterIdx(Number(key))}
      />

      {/* Pull-to-Refresh Indikator */}
      <PullToRefreshIndicator isPulling={isPulling} pullProgress={pullProgress} />

      {/* Inhalt */}
      <div className="pt-[3.85rem]">
        {/* Sprint-Filter Chips (horizontal scrollbar, oberhalb der Liste) */}
        {iterations && iterations.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-800/50 bg-slate-900/60">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setSelectedIteration(null)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedIteration === null
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("allSprints")}
              </button>
              {iterations.map((iter) => (
                <button
                  key={iter.id}
                  onClick={() => setSelectedIteration(iter.path)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedIteration === iter.path
                      ? "bg-blue-600 text-white"
                      : iter.attributes.timeFrame === "current"
                      ? "bg-slate-700 text-blue-300 hover:text-blue-100"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {iter.name}
                  {iter.attributes.timeFrame === "current" && (
                    <span className="ml-1 text-[9px] opacity-70">●</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorMessage message={t("loadError")} error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title={t("noWorkItems")} description={t("noEntriesInFilter")} />
        ) : viewMode === "list" ? (
          <div className="divide-y divide-slate-800/50">
            {filtered.map((item) => (
              <WorkItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <BoardView items={filtered} />
        )}
      </div>

      {/* FAB: Neues Work Item erstellen */}
      <button
        onClick={() => setCreateSheetOpen(true)}
        className="fixed right-5 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:bg-blue-700 transition-colors"
        style={{ bottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom-effective) + 1rem)" }}
        aria-label={t("createWorkItem")}
      >
        <Plus size={24} />
      </button>

      {/* Create-Work-Item-Sheet */}
      <CreateWorkItemSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      />
    </div>
  );
}

/** Einzelne Work-Item-Zeile in der Listenansicht mit Navigations-Link. */
function WorkItemRow({ item }: { item: WorkItem }) {
  const t = useTranslations("workItems");
  const title = item.fields["System.Title"];
  const state = item.fields["System.State"];
  const type = item.fields["System.WorkItemType"];
  const assignedTo = item.fields["System.AssignedTo"];
  const changedDate = item.fields["System.ChangedDate"];
  const priority = item.fields["Microsoft.VSTS.Common.Priority"];
  const badgeLabels = { active: t("activeBadge"), new: t("newBadge"), resolved: t("resolvedBadge"), closed: t("closedBadge") };

  return (
    <Link href={`/work-items/${item.id}`} className="flex px-4 py-3.5 items-start gap-3 active:bg-slate-800/40 transition-colors">
      <div className="mt-0.5">
        {workItemTypeIcon(type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap mb-1">
          <span className="text-xs font-mono text-slate-600">#{item.id}</span>
          {priorityLabel(priority)}
        </div>
        <p className="text-sm text-slate-100 leading-snug mb-1.5 line-clamp-2">{title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {workItemStateBadge(state, badgeLabels)}
          {assignedTo && (
            <span className="text-xs text-slate-500">{assignedTo.displayName}</span>
          )}
          {changedDate && (
            <span className="text-xs text-slate-600 ml-auto">
              {timeAgo(changedDate)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Board-Ansicht mit horizontalen Spalten fuer jeden Status. */
function BoardView({ items }: { items: WorkItem[] }) {
  // Work Items nach Status gruppieren
  const grouped: Record<string, WorkItem[]> = {};
  for (const state of BOARD_STATES) {
    grouped[state] = items.filter((item) => item.fields["System.State"] === state);
  }

  return (
    <div className="overflow-x-auto hide-scrollbar">
      <div className="flex gap-3 px-4 py-3 min-w-max">
        {BOARD_STATES.map((state) => {
          const stateItems = grouped[state] ?? [];
          return (
            <div key={state} className="w-64 flex-shrink-0 flex flex-col gap-2">
              {/* Spalten-Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-slate-400">{state}</span>
                <span className="text-[11px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{stateItems.length}</span>
              </div>

              {/* Karten */}
              <div className="flex flex-col gap-2">
                {stateItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-600">–</div>
                ) : (
                  stateItems.map((item) => (
                    <BoardCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Einzelne Karte in der Board-Ansicht. */
function BoardCard({ item }: { item: WorkItem }) {
  const title = item.fields["System.Title"];
  const type = item.fields["System.WorkItemType"];
  const assignedTo = item.fields["System.AssignedTo"];
  const priority = item.fields["Microsoft.VSTS.Common.Priority"];

  return (
    <Link
      href={`/work-items/${item.id}`}
      className="block rounded-xl bg-slate-800/80 border border-slate-700/50 px-3 py-2.5 active:bg-slate-700/80 transition-colors"
    >
      {/* Typ und Prioritaet */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {workItemTypeIcon(type)}
        <span className="text-[10px] font-mono text-slate-600">#{item.id}</span>
        {priority && <span className={`text-[10px] font-medium ml-auto ${priority === 1 ? "text-red-400" : priority === 2 ? "text-yellow-400" : "text-slate-500"}`}>P{priority}</span>}
      </div>

      {/* Titel (max. 2 Zeilen) */}
      <p className="text-xs text-slate-200 leading-snug line-clamp-2 mb-2">{title}</p>

      {/* Zugewiesene Person als Avatar */}
      {assignedTo && (
        <div className="flex items-center justify-end">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[9px] font-semibold text-slate-300">
            {getInitials(assignedTo.displayName)}
          </div>
        </div>
      )}
    </Link>
  );
}
