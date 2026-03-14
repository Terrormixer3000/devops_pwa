"use client";

/**
 * Work-Items-Seite: Zeigt dem angemeldeten Benutzer zugewiesene Azure Boards Work Items
 * mit Status-Filter, Typ-Icons und Prioritaets-Labels.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TabBar } from "@/components/ui/TabBar";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { workItemsService } from "@/lib/services/workItemsService";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { WorkItem, WorkItemState } from "@/types";
import { CheckSquare, Bug, BookOpen, Zap, Layers, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

// Status-Filter-Tabs — moved inside component to use translations

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

/** Haupt-Seite fuer Work Items mit Status-Filter-Tabs. */
export default function WorkItemsPage() {
  const [filterIdx, setFilterIdx] = useState(0);
  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const t = useTranslations("workItems");
  const STATE_FILTERS: { label: string; values: WorkItemState[] | null }[] = [
    { label: t("active"), values: ["Active", "New"] },
    { label: t("resolved"), values: ["Resolved"] },
    { label: t("all"), values: null },
  ];

  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: ["work-items", settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? workItemsService.queryMyWorkItems(client, settings.project)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
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
      <AppBar title="Work Items" />

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
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorMessage message={t("loadError")} error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title={t("noWorkItems")} description={t("noEntriesInFilter")} />
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filtered.map((item) => (
              <WorkItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Einzelne Work-Item-Zeile mit Typ, Titel, Status und Prioritaet. */
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
    <div className="px-4 py-3.5 flex items-start gap-3">
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
    </div>
  );
}
