"use client";

/**
 * Pull-Request-Listenseite: Zeigt offene, abgeschlossene oder aufgegebene PRs
 * gefiltert nach Repository und Status.
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TabBar } from "@/components/ui/TabBar";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { usePRRepoStore } from "@/lib/stores/selectionStore";
import { PRRepoSelector } from "@/components/layout/selectors/RepoSelector";
import { PRStatus, PullRequest } from "@/types";
import { GitPullRequest, ThumbsUp, Clock, GitMerge, Plus } from "lucide-react";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { timeAgo } from "@/lib/utils/timeAgo";
import { stripRefPrefix } from "@/lib/utils/gitUtils";

// Status-Filter Optionen
const STATUS_OPTIONS: { label: string; value: PRStatus }[] = [
  { label: "Aktiv", value: "active" },
  { label: "Abgeschlossen", value: "completed" },
  { label: "Aufgegeben", value: "abandoned" },
  { label: "Alle", value: "all" },
];

/** Uebersicht aller Pull Requests mit Status- und Repository-Filter. */
export default function PullRequestsPage() {
  const [status, setStatus] = useState<PRStatus>("active");
  const { settings } = useSettingsStore();
  const { repositories } = useRepositoryStore();
  const { client } = useAzureClient();
  // Tab-spezifische Repo-Auswahl (leer = alle Repos laden)
  const { selectedIds: selectedRepoIds } = usePRRepoStore();

  // Repositories fuer die Abfrage: ausgewaehlte oder alle
  const targetRepos = selectedRepoIds.length > 0
    ? repositories.filter((r) => selectedRepoIds.includes(r.id))
    : repositories;

  // PRs aus allen Ziel-Repositories laden und zusammenfuehren
  const { data: prsByRepo, isLoading, error, refetch } = useQuery({
    queryKey: ["pull-requests", selectedRepoIds, status, settings?.project, settings?.demoMode],
    queryFn: async () => {
      if (!client || !settings || targetRepos.length === 0) return [];
      const results = await Promise.allSettled(
        targetRepos.map((repo) =>
          pullRequestsService.listPullRequests(client, settings.project, repo.id, status, 50)
            .then((prs) => prs.map((pr) => ({ ...pr, _repoName: repo.name })))
        )
      );
      return results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<(PullRequest & { _repoName: string })[]>).value)
        .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    },
    enabled: !!client && !!settings && targetRepos.length > 0,
  });

  const prs = prsByRepo || [];

  const { pullProgress, isPulling } = usePullToRefresh({
    onRefresh: () => { void refetch(); },
    isRefreshing: isLoading,
  });

  return (
    <div className="min-h-screen">
      <AppBar title="Pull Requests" rightSlot={<PRRepoSelector />} />

      {/* Status-Filter Tabs */}
      <TabBar
        tabs={STATUS_OPTIONS.map(({ label, value }) => ({ key: value, label }))}
        activeKey={status}
        onChange={(key) => setStatus(key as PRStatus)}
      />

      {/* Pull-to-Refresh Indikator */}
      <PullToRefreshIndicator isPulling={isPulling} pullProgress={pullProgress} />

      {/* Inhalt */}
      <div className="pt-[3.85rem]">
        {repositories.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="Keine Repositories konfiguriert"
            description="Konfiguriere erst ein Azure DevOps Projekt in den Einstellungen"
          />
        ) : isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorMessage message="Fehler beim Laden der Pull Requests" error={error} onRetry={refetch} />
        ) : prs.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="Keine Pull Requests"
            description={`Keine ${status === "active" ? "aktiven" : ""} Pull Requests gefunden`}
          />
        ) : (
          <div className="divide-y divide-slate-800/50">
            {prs.map((pr) => (
              <PRListItem key={`${pr.repository.id}-${pr.pullRequestId}`} pr={pr} multiRepo={targetRepos.length > 1} />
            ))}
          </div>
        )}
      </div>

      {/* FAB: Neuer PR erstellen */}
      <Link
        href="/pull-requests/new"
        className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
        style={{ bottom: "var(--fab-bottom-offset)" }}
        aria-label="Neuen Pull Request erstellen"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}

// Einzelner PR-Listeneintrag
function PRListItem({ pr, multiRepo }: { pr: PullRequest & { _repoName?: string }; multiRepo: boolean }) {
  const sourceBranch = stripRefPrefix(pr.sourceRefName);
  const targetBranch = stripRefPrefix(pr.targetRefName);

  // Vote-Status des aktuellen Benutzers ermitteln
  const approvedCount = pr.reviewers.filter((r) => r.vote === 10).length;
  const waitingCount = pr.reviewers.filter((r) => r.vote === -5).length;

  const statusVariant: Record<string, "success" | "muted" | "danger" | "info"> = {
    active: "info",
    completed: "success",
    abandoned: "muted",
  };

  return (
    <Link
      href={`/pull-requests/${pr.repository.id}/${pr.pullRequestId}`}
      className="block px-4 py-4 hover:bg-slate-800/30 transition-colors"
    >
      {/* Repository-Name bei Mehrfachauswahl anzeigen */}
      {multiRepo && (
        <p className="text-xs text-blue-400 font-medium mb-1">{pr._repoName || pr.repository.name}</p>
      )}

      {/* PR-Titel */}
      <p className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">{pr.title}</p>

      {/* Branch-Info */}
      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
        <span className="text-slate-400 font-mono truncate max-w-[100px]">{sourceBranch}</span>
        <GitMerge size={12} />
        <span className="text-slate-400 font-mono truncate max-w-[100px]">{targetBranch}</span>
      </div>

      {/* Metadaten-Zeile */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={11} />
          <span>{timeAgo(pr.creationDate)}</span>
        </div>
        <span className="text-xs text-slate-500">{pr.createdBy.displayName}</span>

        {/* Badges */}
        {pr.isDraft && <Badge variant="muted" size="sm">Draft</Badge>}
        {pr.status !== "active" && (
          <Badge variant={statusVariant[pr.status] || "default"} size="sm">
            {pr.status === "completed" ? "Merged" : pr.status}
          </Badge>
        )}

        {/* Reviewer-Status */}
        {approvedCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <ThumbsUp size={11} />
            <span>{approvedCount}</span>
          </div>
        )}
        {waitingCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <Clock size={11} />
            <span>{waitingCount} warten</span>
          </div>
        )}
      </div>
    </Link>
  );
}
