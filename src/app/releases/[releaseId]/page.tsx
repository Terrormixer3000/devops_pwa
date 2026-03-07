"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BackLink } from "@/components/ui/BackButton";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { releasesService } from "@/lib/services/releasesService";
import { ReleaseEnvironment, ReleaseApproval } from "@/types";
import { CheckCircle, XCircle, Clock, Loader, ThumbsUp, ThumbsDown } from "lucide-react";

export default function ReleaseDetailPage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = use(params);
  const releaseIdNum = parseInt(releaseId);
  const [approvalModal, setApprovalModal] = useState<ReleaseApproval | null>(null);
  const [approvalComment, setApprovalComment] = useState("");

  const { settings } = useSettingsStore();
  const { vsrmClient } = useAzureClient();
  const qc = useQueryClient();

  // Release-Details laden
  const { data: release, isLoading, error } = useQuery({
    queryKey: ["release", releaseIdNum, settings?.project, settings?.demoMode],
    queryFn: () => vsrmClient && settings
      ? releasesService.getRelease(vsrmClient, settings.project, releaseIdNum)
      : Promise.reject("Kein Client"),
    enabled: !!vsrmClient && !!settings,
    refetchInterval: 15000,
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
      qc.invalidateQueries({ queryKey: ["release", releaseIdNum] });
      qc.invalidateQueries({ queryKey: ["release-approvals"] });
    },
  });

  if (isLoading) return <div className="min-h-screen"><AppBar title="Release" /><PageLoader /></div>;
  if (error || !release) return <div className="min-h-screen"><AppBar title="Release" /><ErrorMessage message="Release konnte nicht geladen werden" /></div>;

  return (
    <div className="min-h-screen">
      <AppBar title="Release Details" />

      {/* Zurueck */}
      <div className="px-4 pt-4">
        <BackLink href="/releases" label="Releases" className="mb-3" />
      </div>

      {/* Release-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <h1 className="text-base font-semibold text-slate-100 mb-1">{release.name}</h1>
        <p className="text-xs text-slate-500">{release.releaseDefinition.name}</p>
        <p className="text-xs text-slate-600 mt-1">
          {release.createdBy.displayName} · {formatDistanceToNow(new Date(release.createdOn), { addSuffix: true, locale: de })}
        </p>
        {release.description && (
          <p className="text-sm text-slate-300 mt-2">{release.description}</p>
        )}
      </div>

      {/* Umgebungs-Uebersicht */}
      <div className="px-4 py-4 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Umgebungen</h2>
        {(release.environments ?? [])
          .sort((a, b) => a.rank - b.rank)
          .map((env) => (
            <EnvironmentCard key={env.id} env={env} onApprove={(a) => setApprovalModal(a)} />
          ))}
      </div>

      {/* Approval Modal */}
      <Modal open={!!approvalModal} onClose={() => setApprovalModal(null)} title="Approval erteilen">
        <div className="space-y-4">
          {approvalModal && (
            <p className="text-sm text-slate-300">
              {release.name} → {approvalModal.releaseEnvironmentReference?.name || "Environment"}
            </p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-400">Kommentar (optional)</label>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
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

// Umgebungskarte mit Status und Deploy-Schritten
function EnvironmentCard({ env, onApprove }: { env: ReleaseEnvironment; onApprove: (approval: ReleaseApproval) => void }) {
  const variants: Record<string, "success" | "danger" | "info" | "muted" | "warning"> = {
    succeeded: "success",
    rejected: "danger",
    inProgress: "info",
    notStarted: "muted",
    canceled: "muted",
    queued: "warning",
    partiallySucceeded: "warning",
  };

  const statusLabels: Record<string, string> = {
    succeeded: "Erfolgreich",
    rejected: "Abgelehnt",
    inProgress: "Laeuft",
    notStarted: "Ausstehend",
    canceled: "Abgebrochen",
    queued: "In der Warteschlange",
    partiallySucceeded: "Teilweise erfolgreich",
    scheduled: "Geplant",
  };

  return (
    <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Umgebungs-Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <p className="text-sm font-medium text-slate-100">{env.name}</p>
        <Badge variant={variants[env.status] || "muted"} size="sm">
          {statusLabels[env.status] || env.status}
        </Badge>
      </div>

      {/* Ausstehende Pre-Deploy Approvals */}
      {env.preDeployApprovals?.filter((a) => a.status === "pending").length > 0 && (
        <div className="px-4 py-2.5 bg-yellow-900/20 border-b border-slate-700/50">
          <p className="text-xs text-yellow-400 mb-2">
            Warte auf Approval von: {env.preDeployApprovals.filter((a) => a.status === "pending").map((a) => a.approver.displayName).join(", ")}
          </p>
          <div className="flex gap-2">
            {env.preDeployApprovals.filter((a) => a.status === "pending").map((a) => (
              <button
                key={a.id}
                onClick={() => onApprove(a)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-400 rounded-lg text-xs font-medium transition-colors"
              >
                <ThumbsUp size={12} />
                Approven
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Deploy-Schritte */}
      {env.deploySteps?.length > 0 && (
        <div className="px-4 py-2">
          {env.deploySteps.slice(-1).map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-xs text-slate-400">
              <DeployStatusIcon status={step.status} />
              <span>{step.status}</span>
              {step.completedOn && (
                <span className="ml-auto text-slate-600">
                  {formatDistanceToNow(new Date(step.completedOn), { addSuffix: true, locale: de })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Deploy-Status-Icon
function DeployStatusIcon({ status }: { status: string }) {
  if (status === "inProgress") return <Loader size={12} className="text-blue-400 animate-spin" />;
  if (status === "succeeded") return <CheckCircle size={12} className="text-green-400" />;
  if (status === "failed" || status === "rejected") return <XCircle size={12} className="text-red-400" />;
  return <Clock size={12} className="text-slate-600" />;
}
