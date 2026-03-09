"use client";

/**
 * Dashboard-Seite: Zeigt eine kompakte Zusammenfassung aller aktiven PRs,
 * laufenden Pipelines und Highlights aus den konfigurierten Repositories.
 */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { BuildStatusDot } from "@/components/ui/BuildStatusIndicator";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { PullRequest } from "@/types";
import { useRepositoryStore } from "@/lib/stores/repositoryStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { pipelinesService } from "@/lib/services/pipelinesService";
import { useDashboardRepoStore } from "@/lib/stores/selectionStore";
import { DashboardSelector } from "@/components/layout/selectors/DashboardSelector";
import {
  GitPullRequest,
  PlayCircle,
  Settings,
  AlertCircle,
  ChevronRight,
  Rocket,
  CheckSquare,
  FolderGit2,
} from "lucide-react";

/** Startseite der App mit PR-, Pipeline- und Repository-Zusammenfassung. */
export default function DashboardPage() {
  const { isConfigured } = useSettingsStore();
  const { repositories } = useRepositoryStore();
  const { client } = useAzureClient();
  const settings = useSettingsStore((s) => s.settings);

  // Dashboard-spezifische Repo-Auswahl (leer = alle Repos)
  const { selectedIds: selectedRepoIds } = useDashboardRepoStore();
  const targetRepos = selectedRepoIds.length > 0
    ? repositories.filter((r) => selectedRepoIds.includes(r.id))
    : repositories;

  // Aktive Pull Requests laden – aggregiert aus allen Ziel-Repositories
  const { data: prs, isLoading: prsLoading } = useQuery({
    queryKey: ["dashboard-prs", selectedRepoIds, settings?.project, settings?.demoMode],
    queryFn: async () => {
      if (!client || !settings || targetRepos.length === 0) return [];
      const results = await Promise.allSettled(
        targetRepos.map((repo) =>
          pullRequestsService.listPullRequests(client, settings.project, repo.id, "active", 5)
        )
      );
      return results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<PullRequest[]>).value)
        .slice(0, 10);
    },
    enabled: !!client && !!settings && targetRepos.length > 0,
  });

  // Letzte Builds laden (global, kein Repo-Filter noetig)
  const { data: builds, isLoading: buildsLoading, error: buildsError } = useQuery({
    queryKey: ["dashboard-builds", settings?.project, settings?.demoMode],
    queryFn: () =>
      client && settings
        ? pipelinesService.listBuilds(client, settings.project, undefined, 5)
        : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Wenn noch keine Einstellungen vorhanden: Hinweis anzeigen
  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <AppBar title="Dashboard" />
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center">
            <Settings size={28} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-100">Einstellungen konfigurieren</h2>
            <p className="text-sm text-slate-400 mt-1">
              Gib deine Azure DevOps Organisation und deinen PAT ein, um loszulegen.
            </p>
          </div>
          <Link
            href="/settings"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Zu den Einstellungen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppBar title="Dashboard" rightSlot={<DashboardSelector />} />

      <div className="px-4 py-4 space-y-6">
        {/* Hinweis wenn keine Repositories konfiguriert */}
        {repositories.length === 0 && (
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">
              Konfiguriere ein Azure DevOps Projekt, um Daten zu sehen.
            </p>
          </div>
        )}

        {/* Schnellzugriff-Kacheln */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Schnellzugriff
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/pull-requests" icon={<GitPullRequest size={22} className="text-blue-400" />} label="Pull Requests" count={prs?.length} />
            <QuickLink href="/pipelines" icon={<PlayCircle size={22} className="text-green-400" />} label="Pipelines" />
            <QuickLink href="/releases" icon={<Rocket size={22} className="text-purple-400" />} label="Releases" />
            <QuickLink href="/explorer" icon={<FolderGit2 size={22} className="text-orange-400" />} label="Code Explorer" />
            <QuickLink href="/work-items" icon={<CheckSquare size={22} className="text-teal-400" />} label="Work Items" />
          </div>
        </section>

        {/* Aktive Pull Requests */}
        {targetRepos.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Aktive PRs
              </h2>
              <Link href="/pull-requests" className="text-xs text-blue-400 flex items-center gap-1">
                Alle <ChevronRight size={14} />
              </Link>
            </div>

            {prsLoading ? (
              <PageLoader />
            ) : prs && prs.length > 0 ? (
              <div className="space-y-2">
                {prs.map((pr) => (
                  <Link
                    key={pr.pullRequestId}
                    href={`/pull-requests/${pr.repository.id}/${pr.pullRequestId}`}
                    className="block p-3 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-100 line-clamp-1">{pr.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{pr.createdBy.displayName}</span>
                      {pr.isDraft && <Badge variant="muted" size="sm">Draft</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Keine aktiven Pull Requests</p>
            )}
          </section>
        )}

        {/* Letzte Builds */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Letzte Builds
            </h2>
            <Link href="/pipelines" className="text-xs text-blue-400 flex items-center gap-1">
              Alle <ChevronRight size={14} />
            </Link>
          </div>

          {buildsLoading ? (
            <PageLoader />
          ) : buildsError ? (
            <ErrorMessage message="Builds konnten nicht geladen werden" error={buildsError} />
          ) : builds && builds.length > 0 ? (
            <div className="space-y-2">
              {builds.map((build) => (
                <Link
                  key={build.id}
                  href={`/pipelines/${build.id}`}
                  className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <BuildStatusDot status={build.result || build.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{build.definition.name}</p>
                    <p className="text-xs text-slate-500">#{build.buildNumber}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">Keine Builds gefunden</p>
          )}
        </section>
      </div>
    </div>
  );
}

// Schnelllink-Kachel Komponente
/** Navigationskarte zu einem Bereich mit optionalem Badge-Counter. */
function QuickLink({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start gap-2 p-4 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-colors border border-slate-700/50"
    >
      <div className="flex items-center justify-between w-full">
        {icon}
        {count !== undefined && count > 0 && (
          <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-slate-100">{label}</span>
    </Link>
  );
}

// BuildStatusDot is now imported from @/components/ui/BuildStatusIndicator
