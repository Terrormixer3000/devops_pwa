"use client";

/**
 * Pull-Request-Listenseite: Zeigt offene, abgeschlossene oder aufgegebene PRs
 * gefiltert nach Repository und Status.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { TabBar } from "@/components/ui/TabBar";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { CreatePullRequestModal, type CreatePullRequestPayload } from "@/components/pr/CreatePullRequestModal";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { usePRRepoStore } from "@/lib/stores/selectionStore";
import { PRRepoSelector } from "@/components/layout/selectors/RepoSelector";
import { PRStatus, PullRequest } from "@/types";
import { GitPullRequest, ThumbsUp, Clock, GitMerge, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePullToRefresh } from "@/lib/hooks/usePullToRefresh";
import { timeAgo } from "@/lib/utils/timeAgo";
import { stripRefPrefix } from "@/lib/utils/gitUtils";

// Status-Filter Optionen — moved inside component to use translations
export default function PullRequestsPage() {
  const [status, setStatus] = useState<PRStatus>("active");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { settings } = useSettingsStore();
  const { repositories } = useRepositoryStore();
  const { client } = useAzureClient();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTranslations("pullRequests");
  const STATUS_OPTIONS: { label: string; value: PRStatus }[] = [
    { label: t("active"), value: "active" },
    { label: t("completed"), value: "completed" },
    { label: t("abandoned"), value: "abandoned" },
    { label: t("all"), value: "all" },
  ];
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

  const createPullRequestMutation = useMutation({
    mutationFn: (payload: CreatePullRequestPayload) => {
      if (!client || !settings) throw new Error(t("noClient"));
      const { repoId, ...request } = payload;
      return pullRequestsService.create(client, settings.project, repoId, request);
    },
    onSuccess: async (pr, variables) => {
      setCreateModalOpen(false);
      await qc.invalidateQueries({ queryKey: ["pull-requests"] });
      router.push(`/pull-requests/${variables.repoId}/${pr.pullRequestId}`);
    },
  });

  return (
    <div className="min-h-screen">
      <AppBar title={t("title")} rightSlot={<PRRepoSelector />} />

      {/* Status-Filter Tabs */}
      <TabBar
        tabs={STATUS_OPTIONS.map(({ label, value }) => ({ key: value, label }))}
        activeKey={status}
        onChange={(key) => setStatus(key as PRStatus)}
      />

      {/* Pull-to-Refresh Indikator */}
      <PullToRefreshIndicator isPulling={isPulling} pullProgress={pullProgress} isRefreshing={isLoading} />

      {/* Inhalt */}
      <div className="pt-[3.85rem]">
        {repositories.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title={t("noReposConfigured")}
            description={t("noReposConfiguredDesc")}
          />
        ) : isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorMessage message={t("loadError")} error={error} onRetry={refetch} />
        ) : prs.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title={t("noPullRequests")}
            description={t("noPullRequestsDesc")}
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
      <button
        type="button"
        onClick={() => {
          createPullRequestMutation.reset();
          setCreateModalOpen(true);
        }}
        className="fixed right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-900/40 transition-colors hover:bg-blue-500"
        style={{ bottom: "var(--fab-bottom-offset)" }}
        aria-label={t("newPR")}
      >
        <Plus size={18} />
        {t("newPR")}
      </button>

      <CreatePullRequestModal
        open={createModalOpen}
        isPending={createPullRequestMutation.isPending}
        error={createPullRequestMutation.error ? (createPullRequestMutation.error as Error).message : null}
        onClose={() => {
          if (createPullRequestMutation.isPending) return;
          createPullRequestMutation.reset();
          setCreateModalOpen(false);
        }}
        onSubmit={(payload) => createPullRequestMutation.mutate(payload)}
      />
    </div>
  );
}

// Einzelner PR-Listeneintrag
function PRListItem({ pr, multiRepo }: { pr: PullRequest & { _repoName?: string }; multiRepo: boolean }) {
  const t = useTranslations("pullRequests");
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
        {pr.isDraft && <Badge variant="muted" size="sm">{t("draft")}</Badge>}
        {pr.status !== "active" && (
          <Badge variant={statusVariant[pr.status] || "default"} size="sm">
            {pr.status === "completed" ? t("merged") : pr.status}
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
            <span>{t("waitingCount", { count: waitingCount })}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
