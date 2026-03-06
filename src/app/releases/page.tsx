"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { releasesService } from "@/lib/services/releasesService";
import { useReleaseDefStore } from "@/lib/stores/selectionStore";
import { ReleaseSelector } from "@/components/layout/selectors/ReleaseSelector";
import { ReleaseDefinition, ReleaseApproval, ReleaseEnvironment } from "@/types";
import { Rocket, ChevronRight, Play, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";

type Tab = "releases" | "definitionen" | "approvals";

export default function ReleasesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("releases");
  const [startModal, setStartModal] = useState<ReleaseDefinition | null>(null);
  const [approvalModal, setApprovalModal] = useState<ReleaseApproval | null>(null);
  const [approvalComment, setApprovalComment] = useState("");

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
    onSuccess: () => {
      setStartModal(null);
      qc.invalidateQueries({ queryKey: ["releases"] });
    },
  });

  // Approval erteilen
  const approveMutation = useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) =>
      vsrmClient && settings
        ? approve
          ? releasesService.approveRelease(vsrmClient, settings.project, id, approvalComment)
          : releasesService.rejectApproval(vsrmClient, settings.project, id, approvalComment)
        : Promise.reject("Kein Client"),
    onSuccess: () => {
      setApprovalModal(null);
      setApprovalComment("");
      qc.invalidateQueries({ queryKey: ["release-approvals"] });
    },
  });

  const pendingCount = approvals?.length || 0;

  return (
    <div className="min-h-screen">
      <AppBar title="Releases" rightSlot={<ReleaseSelector definitions={definitions || []} loading={defsLoading} />} />

      {/* Tabs */}
      <div className="sticky-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {[
            { key: "releases", label: "Releases" },
            { key: "definitionen", label: "Pipelines" },
            { key: "approvals", label: `Approvals${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
                    <p className="text-sm font-medium text-white truncate">{def.name}</p>
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
            <ErrorMessage message="Releases konnten nicht geladen werden" onRetry={refetch} />
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
                    <p className="text-sm font-medium text-white truncate">{release.name}</p>
                    <p className="text-xs text-slate-500 truncate">{release.releaseDefinition?.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(release.environments ?? []).slice(0, 4).map((env) => (
                        <EnvironmentBadge key={env.id} env={env} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-600">
                      {release.createdOn ? formatDistanceToNow(new Date(release.createdOn), { addSuffix: true, locale: de }) : ""}
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
                      <p className="text-sm font-medium text-white">{approval.releaseReference?.name}</p>
                      <p className="text-xs text-slate-500">{approval.releaseEnvironmentReference?.name}</p>
                    </div>
                    <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {formatDistanceToNow(new Date(approval.createdOn), { addSuffix: true, locale: de })}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => setApprovalModal(approval)}>
                      <ThumbsUp size={14} /> Approven
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => {
                      setApprovalModal(approval);
                    }}>
                      <ThumbsDown size={14} /> Ablehnen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
      <Modal open={!!approvalModal} onClose={() => setApprovalModal(null)} title="Approval erteilen">
        <div className="space-y-4">
          {approvalModal && (
            <p className="text-sm text-slate-300">
              {approvalModal.releaseReference?.name} → {approvalModal.releaseEnvironmentReference?.name}
            </p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Kommentar (optional)</label>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <Button
            fullWidth
            loading={approveMutation.isPending}
            onClick={() => approvalModal && approveMutation.mutate({ id: approvalModal.id, approve: true })}
          >
            <ThumbsUp size={16} /> Approven
          </Button>
          <Button
            fullWidth
            variant="danger"
            loading={approveMutation.isPending}
            onClick={() => approvalModal && approveMutation.mutate({ id: approvalModal.id, approve: false })}
          >
            <ThumbsDown size={16} /> Ablehnen
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setApprovalModal(null)}>Abbrechen</Button>
        </div>
      </Modal>
    </div>
  );
}

// Umgebungs-Status Badge
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
