"use client";

/**
 * Release-Seite: Verwaltet Release-Definitionen, listet Releases und ermoeglicht
 * das Ausloesen neuer Deployments sowie die Freigabe ausstehender Approvals.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TabBar } from "@/components/ui/TabBar";
import { ApprovalModal } from "@/components/ui/ApprovalModal";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { releasesService } from "@/lib/services/releasesService";
import { useReleaseDefStore } from "@/lib/stores/selectionStore";
import { ReleaseSelector } from "@/components/layout/selectors/ReleaseSelector";
import { DeliveryTitleSelector } from "@/components/layout/DeliveryTitleSelector";
import { ReleaseDefinition, ReleaseApproval, ReleaseEnvironment } from "@/types";
import { Rocket, ChevronRight, Play, Plus, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { timeAgo } from "@/lib/utils/timeAgo";

type Tab = "releases" | "definitionen" | "approvals";

/** Haupt-Seite fuer Releases und Release-Definitionen mit Tab-Navigation. */
export default function ReleasesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("releases");
  const [startModal, setStartModal] = useState<ReleaseDefinition | null>(null);
  const [approvalModal, setApprovalModal] = useState<ReleaseApproval | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Flash-Banner nach erfolgreicher Pipeline-Erstellung (via URL-Param ?created=<name>)
  useEffect(() => {
    const created = searchParams.get("created");
    if (!created) return;
    setFlashMessage(`Release-Pipeline "${created}" wurde erstellt.`);
    setActiveTab("definitionen");
    router.replace("/releases");
    const timeoutId = window.setTimeout(() => setFlashMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [searchParams, router]);

  const { settings } = useSettingsStore();
  const { vsrmClient } = useAzureClient();
  const qc = useQueryClient();

  // Ausgewaehlte Release-Definitionen aus dem Tab-spezifischen Store
  const { selectedIds: selectedDefIds } = useReleaseDefStore();

  // Release-Definitionen laden
  const { data: definitions, isLoading: defsLoading } = useQuery({
    queryKey: ["release-definitions", settings?.project, settings?.demoMode],
    queryFn: () => vsrmClient && settings
      ? releasesService.listDefinitions(vsrmClient, settings.project)
      : Promise.resolve([]),
    enabled: !!vsrmClient && !!settings,
  });

  // Releases laden
  const { data: releases, isLoading: releasesLoading, error: releasesError, refetch } = useQuery({
    queryKey: ["releases", settings?.project, settings?.demoMode],
    queryFn: () => vsrmClient && settings
      ? releasesService.listReleases(vsrmClient, settings.project, undefined, 30)
      : Promise.resolve([]),
    enabled: !!vsrmClient && !!settings,
    refetchInterval: 20000,
  });

  // Ausstehende Approvals laden
  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["release-approvals", settings?.project, settings?.demoMode],
    queryFn: () => vsrmClient && settings
      ? releasesService.getPendingApprovals(vsrmClient, settings.project)
      : Promise.resolve([]),
    enabled: !!vsrmClient && !!settings,
    refetchInterval: 15000,
  });

  // Releases nach ausgewaehlten Definitionen filtern (leer = alle anzeigen)
  const filteredReleases = selectedDefIds.length > 0
    ? (releases ?? []).filter((r) => selectedDefIds.includes(String(r.releaseDefinition?.id)))
    : (releases ?? []);

  // Release starten
  const startMutation = useMutation({
    mutationFn: (def: ReleaseDefinition) =>
      vsrmClient && settings
        ? releasesService.createRelease(vsrmClient, settings.project, def.id)
        : Promise.reject("Kein Client"),
    onSuccess: (createdRelease) => {
      setStartModal(null);
      qc.invalidateQueries({ queryKey: ["releases"] });
      router.push(`/releases/${createdRelease.id}`);
    },
  });

  // Approval erteilen
  const approveMutation = useMutation({
    mutationFn: ({ id, approve, comment }: { id: number; approve: boolean; comment: string }) =>
      vsrmClient && settings
        ? approve
          ? releasesService.approveRelease(vsrmClient, settings.project, id, comment)
          : releasesService.rejectApproval(vsrmClient, settings.project, id, comment)
        : Promise.reject("Kein Client"),
    onSuccess: () => {
      setApprovalModal(null);
      setApprovalError(null);
      qc.invalidateQueries({ queryKey: ["release-approvals"] });
    },
    onError: (err: Error) => setApprovalError(err.message),
  });

  const pendingCount = approvals?.length || 0;

  return (
    <div className="min-h-screen">
      <AppBar title={<DeliveryTitleSelector current="releases" />} rightSlot={<ReleaseSelector definitions={definitions || []} loading={defsLoading} />} />

      {/* Tabs */}
      <TabBar
        tabs={[
          { key: "releases", label: "Releases" },
          { key: "definitionen", label: "Pipelines" },
          { key: "approvals", label: `Approvals${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as Tab)}
      />

      {/* Flash-Banner nach Pipeline-Erstellung */}
      {flashMessage && (
        <div className="px-4 pt-2">
          <div className="rounded-2xl border border-green-700/40 bg-green-900/20 px-4 py-3 text-sm text-green-300">
            {flashMessage}
          </div>
        </div>
      )}

      <div className="pt-[3.85rem]">
        {/* Definitionen */}
        {activeTab === "definitionen" && (
          <div>
            {defsLoading ? <PageLoader /> : !definitions?.length ? (
              <EmptyState icon={Rocket} title="Keine Release-Pipelines" />
            ) : (
              <div className="divide-y divide-slate-800/50">
                {definitions.map((def) => (
                  <div key={def.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{def.name}</p>
                      {def.description && <p className="text-xs text-slate-500 truncate">{def.description}</p>}
                    </div>
                    <button
                      onClick={() => setStartModal(def)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700/30 hover:bg-purple-700/50 text-purple-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Play size={12} />
                      Starten
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Releases */}
        {activeTab === "releases" && (
          <div>
            {releasesLoading ? <PageLoader /> : releasesError ? (
              <ErrorMessage message="Releases konnten nicht geladen werden" error={releasesError} onRetry={refetch} />
            ) : !filteredReleases.length ? (
              <EmptyState icon={Rocket} title="Keine Releases gefunden" />
            ) : (
              <div className="divide-y divide-slate-800/50">
                {filteredReleases.map((release) => (
                  <Link
                    key={release.id}
                    href={`/releases/${release.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{release.name}</p>
                      <p className="text-xs text-slate-500 truncate">{release.releaseDefinition?.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(release.environments ?? []).slice(0, 4).map((env) => (
                          <EnvironmentBadge key={env.id} env={env} />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-600">
                        {release.createdOn ? timeAgo(release.createdOn) : ""}
                      </span>
                      <ChevronRight size={16} className="text-slate-600" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ausstehende Approvals */}
        {activeTab === "approvals" && (
          <div>
            {approvalsLoading ? <PageLoader /> : !approvals?.length ? (
              <EmptyState icon={ThumbsUp} title="Keine ausstehenden Approvals" />
            ) : (
              <div className="divide-y divide-slate-800/50">
                {approvals.map((approval) => (
                  <div key={approval.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{approval.releaseReference?.name}</p>
                        <p className="text-xs text-slate-500">{approval.releaseEnvironmentReference?.name}</p>
                      </div>
                      <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {timeAgo(approval.createdOn)}
                    </p>
                    <div className="flex gap-2">
                      {approval.releaseReference?.id ? (
                        <Link
                          href={`/releases/${approval.releaseReference.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/80"
                        >
                          Details
                          <ChevronRight size={13} />
                        </Link>
                      ) : null}
                      <Button size="sm" variant="primary" onClick={() => setApprovalModal(approval)}>
                        <ThumbsUp size={14} /> Approven
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setApprovalModal(approval)}>
                        <ThumbsDown size={14} /> Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB: Neue Release-Pipeline erstellen (nur im Definitionen-Tab) */}
      {activeTab === "definitionen" && (
        <button
          onClick={() => router.push("/releases/new")}
          className="fixed right-4 z-50 flex items-center gap-2 rounded-full bg-purple-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-purple-900/40 transition-colors hover:bg-purple-500"
          style={{ bottom: "var(--fab-bottom-offset)" }}
        >
          <Plus size={18} />
          Neue Release-Pipeline
        </button>
      )}

      {/* Release starten Modal */}
      <Modal open={!!startModal} onClose={() => setStartModal(null)} title="Release starten">
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{startModal?.name}</p>
          {startMutation.isError && (
            <p className="text-sm text-red-400">{(startMutation.error as Error).message}</p>
          )}
          <Button fullWidth loading={startMutation.isPending} onClick={() => startModal && startMutation.mutate(startModal)}>
            <Rocket size={16} /> Release erstellen
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setStartModal(null)}>Abbrechen</Button>
        </div>
      </Modal>

      {/* Approval Modal */}
      <ApprovalModal
        open={!!approvalModal}
        approval={approvalModal ? {
          id: approvalModal.id,
          releaseName: approvalModal.releaseReference?.name,
          environmentName: approvalModal.releaseEnvironmentReference?.name,
        } : null}
        isPending={approveMutation.isPending}
        error={approvalError}
        onApprove={(id, comment) => approveMutation.mutate({ id, approve: true, comment })}
        onReject={(id, comment) => approveMutation.mutate({ id, approve: false, comment })}
        onClose={() => { setApprovalModal(null); setApprovalError(null); }}
      />
    </div>
  );
}

// Umgebungs-Status Badge
/** Zeigt eine farbige Badge fuer den Status einer Release-Umgebung. */
function EnvironmentBadge({ env }: { env: ReleaseEnvironment }) {
  const variants: Record<string, "success" | "danger" | "info" | "muted" | "warning"> = {
    succeeded: "success",
    rejected: "danger",
    inProgress: "info",
    notStarted: "muted",
    canceled: "muted",
    queued: "warning",
    partiallySucceeded: "warning",
  };
  return (
    <Badge variant={variants[env.status] || "muted"} size="sm">
      {env.name}
    </Badge>
  );
}
