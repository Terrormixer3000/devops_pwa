"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle, UserPlus, X, ShieldCheck,
  CheckCircle2, XCircle, Clock, Minus, ChevronDown, ChevronUp,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { VoteBadge } from "./VoteBadge";
import type { PullRequest } from "@/types";

/** Minimal-Typ für eine Pipeline-Policy auf einem Pull Request. */
type PRPolicy = { id: string; status: string; displayName: string; isRequired: boolean };

/** Übersichts-Tab: Zeigt PR-Details, Reviewer-Liste, Policies und Merge-Blocker. */
export function PRTabOverview({
  pr,
  policies,
  mergeBlockers,
  onOpenReviewerModal,
  onToggleReviewerRequired,
  onRemoveReviewer,
}: {
  pr: PullRequest;
  policies: PRPolicy[] | undefined;
  mergeBlockers: string[];
  onOpenReviewerModal: () => void;
  onToggleReviewerRequired: (reviewerId: string, isRequired: boolean) => void;
  onRemoveReviewer: (reviewerId: string) => void;
}) {
  const t = useTranslations("prOverview");
  const tPrs = useTranslations("prs");
  const isActive = pr.status === "active";

  // Richtlinien-Abschnitt standardmaessig ausgeklappt wenn es blockierende Ablehnungen gibt
  const hasBlockingRejection = (policies || []).some(
    (p) => p.isRequired && p.status === "rejected"
  );
  const allApproved =
    (policies || []).length > 0 &&
    (policies || []).every((p) => p.status === "approved" || p.status === "notApplicable");
  const [policiesExpanded, setPoliciesExpanded] = useState(hasBlockingRejection || !allApproved);

  return (
    <div className="space-y-4">
      {/* Merge-Blocker */}
      {isActive && mergeBlockers.length > 0 && (
        <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-3 py-2.5 space-y-1">
          {mergeBlockers.map((msg, i) => (
            <p key={i} className="text-xs text-red-400 flex items-start gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Beschreibung */}
      {pr.description ? (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t("description")}</h3>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{pr.description}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{t("noDescription")}</p>
      )}

      {/* Reviewer */}
      {(pr.reviewers.length > 0 || isActive) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("reviewers")}</h3>
            {isActive && (
              <button
                onClick={onOpenReviewerModal}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <UserPlus size={13} /> {t("addReviewer")}
              </button>
            )}
          </div>
          <div className="space-y-1">
            {pr.reviewers.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/40">
                <span className="text-sm text-slate-300 flex-1 truncate">{r.displayName}</span>
                <VoteBadge vote={r.vote} />
                {isActive && (
                  <>
                    <button
                      onClick={() => onToggleReviewerRequired(r.id, !r.isRequired)}
                      title={r.isRequired ? t("setOptional") : t("setRequired")}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0 ${
                        r.isRequired
                          ? "border-red-700/60 text-red-400 hover:bg-red-900/30"
                          : "border-slate-600 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {r.isRequired ? t("required") : t("optional")}
                    </button>
                    <button
                      onClick={() => onRemoveReviewer(r.id)}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                      title={t("removeReviewer")}
                    >
                      <X size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {pr.reviewers.length === 0 && (
              <p className="text-sm text-slate-500 py-1 px-2">{t("noReviewers")}</p>
            )}
          </div>
        </div>
      )}

      {/* Richtlinien (aufklappbar) */}
      {policies && policies.length > 0 && (
        <div>
          {/* Kopfzeile mit Aufklapp-Schalter */}
          <button
            onClick={() => setPoliciesExpanded((v) => !v)}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={12} /> {tPrs("policies")}
            </h3>
            <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
              {policiesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>
          {policiesExpanded && (
            <div className="space-y-1.5">
              {policies.map((policy) => {
                // Status-Icon je nach Policy-Status
                const statusIcon = {
                  approved: <CheckCircle2 size={14} className="text-green-400 shrink-0" />,
                  rejected: <XCircle size={14} className="text-red-400 shrink-0" />,
                  running: <LoadingSpinner size="sm" />,
                  queued: <Clock size={14} className="text-yellow-400 shrink-0" />,
                  notApplicable: <Minus size={14} className="text-slate-500 shrink-0" />,
                }[policy.status] ?? <Minus size={14} className="text-slate-500 shrink-0" />;

                const statusLabel = {
                  approved: tPrs("policyApproved"),
                  rejected: tPrs("policyRejected"),
                  running: tPrs("policyRunning"),
                  queued: tPrs("policyQueued"),
                  notApplicable: tPrs("policyNotApplicable"),
                }[policy.status] ?? policy.status;

                return (
                  <div
                    key={policy.id}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg"
                  >
                    {statusIcon}
                    <span className="text-xs text-slate-300 flex-1 truncate">{policy.displayName}</span>
                    {policy.isRequired && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-700/60 text-red-400 shrink-0">
                        {tPrs("policyRequired")}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 shrink-0">{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
