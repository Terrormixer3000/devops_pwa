"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { usePRRepoStore } from "@/lib/stores/selectionStore";
import { PRRepoSelector } from "@/components/layout/selectors/RepoSelector";
import { PRStatus, PullRequest } from "@/types";
import { GitPullRequest, ThumbsUp, Clock, GitMerge, Plus, RotateCw } from "lucide-react";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";

// Status-Filter Optionen
const STATUS_OPTIONS: { label: string; value: PRStatus }[] = [
  { label: "Aktiv", value: "active" },
  { label: "Abgeschlossen", value: "completed" },
  { label: "Aufgegeben", value: "abandoned" },
  { label: "Alle", value: "all" },
];

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
      <div className="fixed-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {STATUS_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Pull-to-Refresh Indikator */}
      {isPulling && (
        <div
          className="fixed top-[7rem] left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 border border-slate-700 shadow-lg transition-all"
          style={{ opacity: pullProgress, transform: `translateX(-50%) scale(${0.6 + pullProgress * 0.4})` }}
        >
          <RotateCw size={16} className="text-blue-400" style={{ transform: `rotate(${pullProgress * 360}deg)` }} />
        </div>
      )}

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
          <ErrorMessage message="Fehler beim Laden der Pull Requests" onRetry={refetch} />
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
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
        aria-label="Neuen Pull Request erstellen"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}

// Einzelner PR-Listeneintrag
function PRListItem({ pr, multiRepo }: { pr: PullRequest & { _repoName?: string }; multiRepo: boolean }) {
  const sourceBranch = pr.sourceRefName.replace("refs/heads/", "");
  const targetBranch = pr.targetRefName.replace("refs/heads/", "");

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
          <span>{formatDistanceToNow(new Date(pr.creationDate), { addSuffix: true, locale: de })}</span>
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
