"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, UserPlus, X, ShieldCheck } from "lucide-react";
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
  const isActive = pr.status === "active";
  return (
    <div className="space-y-4">
      {/* Merge-Blocker */}
      {isActive && mergeBlockers.length > 0 && (
        <div className="rounded-xl bg-red-950/40 border border-red-800/50 px-3 py-2.5 space-y-1">
          {mergeBlockers.map((msg, i) => (
            <p key={i} className="text-xs text-red-400 flex items-start gap-1.5">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
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
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${
                        r.isRequired
                          ? "border-red-700/60 text-red-400 hover:bg-red-900/30"
                          : "border-slate-600 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {r.isRequired ? t("required") : t("optional")}
                    </button>
                    <button
                      onClick={() => onRemoveReviewer(r.id)}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
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

      {/* Policy Checks */}
      {policies && policies.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ShieldCheck size={12} /> {t("policyChecks")}
          </h3>
          <div className="space-y-1.5">
            {policies.map((policy) => {
              const statusMap: Record<string, { label: string; cls: string }> = {
                approved: { label: t("policyApproved"), cls: "text-green-400" },
                rejected: { label: t("policyRejected"), cls: "text-red-400" },
                queued: { label: t("policyQueued"), cls: "text-yellow-400" },
                running: { label: t("policyRunning"), cls: "text-blue-400" },
                notApplicable: { label: t("policyNotApplicable"), cls: "text-slate-500" },
              };
              const s = statusMap[policy.status] || { label: policy.status, cls: "text-slate-400" };
              return (
                <div
                  key={policy.id}
                  className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {policy.isRequired && <span className="text-red-400 text-xs">*</span>}
                    <span className="text-xs text-slate-300 truncate">{policy.displayName}</span>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ml-2 ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
