"use client";

/**
 * Release-Detailseite: Zeigt alle Umgebungen eines Releases mit Status,
 * Artefakten und Genehmigungsaktionen.
 */

import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { TabBar } from "@/components/ui/TabBar";
import { ApprovalModal } from "@/components/ui/ApprovalModal";
import { BackLink } from "@/components/ui/BackButton";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { releasesService } from "@/lib/services/releasesService";
import { ReleaseEnvironment, ReleaseApproval } from "@/types";
import { CheckCircle, XCircle, Clock, Loader, ThumbsUp, ScrollText } from "lucide-react";
import { timeAgo } from "@/lib/utils/timeAgo";

/** Detailseite fuer ein einzelnes Release mit Umgebungs-Karten und Approval-Dialog. */
export default function ReleaseDetailPage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = use(params);
  const releaseIdNum = parseInt(releaseId);
  const [approvalModal, setApprovalModal] = useState<ReleaseApproval | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"umgebungen" | "logs">("umgebungen");
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);

  const { settings } = useSettingsStore();
  const { vsrmClient } = useAzureClient();
  const qc = useQueryClient();
  const trd = useTranslations("releases.releaseDetail");
  const tReleases = useTranslations("releases");

  // Release-Details laden
  const { data: release, isLoading, error } = useQuery({
    queryKey: ["release", releaseIdNum, settings?.project, settings?.demoMode],
    queryFn: () => vsrmClient && settings
      ? releasesService.getRelease(vsrmClient, settings.project, releaseIdNum)
      : Promise.reject(trd("loadError")),
    enabled: !!vsrmClient && !!settings,
    refetchInterval: 15000,
  });

  // Approval erteilen
  const approveMutation = useMutation({
    mutationFn: ({ id, approve, comment }: { id: number; approve: boolean; comment: string }) =>
      vsrmClient && settings
        ? approve
          ? releasesService.approveRelease(vsrmClient, settings.project, id, comment)
          : releasesService.rejectApproval(vsrmClient, settings.project, id, comment)
        : Promise.reject(trd("loadError")),
    onSuccess: () => {
      setApproveError(null);
      setApprovalModal(null);
      qc.invalidateQueries({ queryKey: ["release", releaseIdNum] });
      qc.invalidateQueries({ queryKey: ["release-approvals"] });
    },
    onError: (err: Error) => setApproveError(err.message),
  });

  // Deployment-Logs laden
  const { data: deployLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["release-logs", releaseIdNum, selectedEnvId, settings?.project, settings?.demoMode],
    queryFn: () => vsrmClient && settings && selectedEnvId
      ? releasesService.getEnvironmentLogs(vsrmClient, settings.project, releaseIdNum, selectedEnvId)
      : Promise.resolve(""),
    enabled: !!vsrmClient && !!settings && !!selectedEnvId && activeTab === "logs",
  });

  if (isLoading) return <div className="min-h-screen"><AppBar title={trd("title")} /><PageLoader /></div>;
  if (error || !release) return <div className="min-h-screen"><AppBar title={trd("title")} /><ErrorMessage message={trd("loadError")} error={error} /></div>;

  return (
    <div className="min-h-screen">
      <AppBar title={trd("title")} />

      {/* Zurueck */}
      <div className="px-4 pt-4">
        <BackLink href="/releases" label={tReleases("title")} className="mb-3" />
      </div>

      {/* Release-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <h1 className="text-base font-semibold text-slate-100 mb-1">{release.name}</h1>
        <p className="text-xs text-slate-500">{release.releaseDefinition.name}</p>
        <p className="text-xs text-slate-600 mt-1">
          {release.createdBy.displayName} · {timeAgo(release.createdOn)}
        </p>
        {release.description && (
          <p className="text-sm text-slate-300 mt-2">{release.description}</p>
        )}
      </div>

      {/* Tab-Leiste */}
      <TabBar
        tabs={[
          { key: "umgebungen", label: trd("environments"), icon: <CheckCircle size={14} /> },
          { key: "logs", label: trd("logs"), icon: <ScrollText size={14} /> },
        ]}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "umgebungen" | "logs")}
        variant="underline"
        className="sticky-below-appbar"
      />

      {/* Tab-Inhalt: Umgebungen */}
      {activeTab === "umgebungen" && (
        <div className="px-4 py-4 space-y-3">
          {(release.environments ?? [])
            .sort((a, b) => a.rank - b.rank)
            .map((env) => (
              <EnvironmentCard key={env.id} env={env} onApprove={(a) => setApprovalModal(a)} />
            ))}
        </div>
      )}

      {/* Tab-Inhalt: Logs */}
      {activeTab === "logs" && (
        <div className="px-4 py-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(release.environments ?? []).sort((a, b) => a.rank - b.rank).map((env) => (
              <button
                key={env.id}
                onClick={() => setSelectedEnvId(env.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  selectedEnvId === env.id
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {env.name}
              </button>
            ))}
          </div>

          {!selectedEnvId && (
            <p className="text-sm text-slate-500 text-center py-8">{trd("selectEnvForLogs")}</p>
          )}
          {selectedEnvId && logsLoading && <PageLoader />}
          {selectedEnvId && !logsLoading && deployLogs && (
            <div className="bg-slate-900 rounded-xl border border-slate-700/60 overflow-auto">
              <pre className="p-3 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                {deployLogs || trd("noLogs")}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        open={!!approvalModal}
        approval={approvalModal ? {
          id: approvalModal.id,
          releaseName: release.name,
          environmentName: approvalModal.releaseEnvironmentReference?.name || trd("environmentFallback"),
        } : null}
        isPending={approveMutation.isPending}
        error={approveError}
        onApprove={(id, comment) => approveMutation.mutate({ id, approve: true, comment })}
        onReject={(id, comment) => approveMutation.mutate({ id, approve: false, comment })}
        onClose={() => { setApprovalModal(null); setApproveError(null); }}
      />
    </div>
  );
}

// Umgebungskarte mit Status und Deploy-Schritten
/** Karte fuer eine einzelne Release-Umgebung mit Status und Genehmigungsschaltflaeche. */
function EnvironmentCard({ env, onApprove }: { env: ReleaseEnvironment; onApprove: (approval: ReleaseApproval) => void }) {
  const trd = useTranslations("releases.releaseDetail");
  const tStatus = useTranslations("releases.releaseDetail.statusLabels");
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
    succeeded: tStatus("succeeded"),
    rejected: tStatus("rejected"),
    inProgress: tStatus("inProgress"),
    notStarted: tStatus("notStarted"),
    canceled: tStatus("canceled"),
    queued: tStatus("queued"),
    partiallySucceeded: tStatus("partiallySucceeded"),
    scheduled: tStatus("scheduled"),
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
          {trd("awaitingApproval", { approvers: env.preDeployApprovals.filter((a) => a.status === "pending").map((a) => a.approver.displayName).join(", ") })}
          </p>
          <div className="flex gap-2">
            {env.preDeployApprovals.filter((a) => a.status === "pending").map((a) => (
              <button
                key={a.id}
                onClick={() => onApprove(a)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-400 rounded-lg text-xs font-medium transition-colors"
              >
                <ThumbsUp size={12} />
                {trd("approve")}
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
                  {timeAgo(step.completedOn)}
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
/** Status-Icon fuer den Deployment-Status einer Umgebung. */
function DeployStatusIcon({ status }: { status: string }) {
  if (status === "inProgress") return <Loader size={12} className="text-blue-400 animate-spin" />;
  if (status === "succeeded") return <CheckCircle size={12} className="text-green-400" />;
  if (status === "failed" || status === "rejected") return <XCircle size={12} className="text-red-400" />;
  return <Clock size={12} className="text-slate-600" />;
}
