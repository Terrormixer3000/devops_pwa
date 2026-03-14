"use client";

import { use } from "react";
import Link from "next/link";
import { AppBar } from "@/components/layout/AppBar";
import { TabBar } from "@/components/ui/TabBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { usePRDetail } from "@/lib/hooks/usePRDetail";
import { PRTabOverview } from "@/components/pr/PRTabOverview";
import { PRTabFiles } from "@/components/pr/PRTabFiles";
import { PRTabComments } from "@/components/pr/PRTabComments";
import { PRTabCommits } from "@/components/pr/PRTabCommits";
import { PRVoteModal } from "@/components/pr/PRVoteModal";
import { PRCompleteModal } from "@/components/pr/PRCompleteModal";
import { PRReviewerModal } from "@/components/pr/PRReviewerModal";
import { timeAgo } from "@/lib/utils/timeAgo";
import {
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  GitMerge,
  AlertCircle,
  FileText,
  GitCommit,
  MessageCircle,
  Clock,
  User,
  X,
} from "lucide-react";

type Tab = "uebersicht" | "dateien" | "kommentare" | "commits";

/** PR-Detailseite mit Übersicht-, Dateien-, Kommentar- und Commit-Tab. */
export default function PRDetailPage({ params }: { params: Promise<{ repoId: string; prId: string }> }) {
  const { repoId, prId } = use(params);
  const prIdNum = parseInt(prId);

  const h = usePRDetail(repoId, prIdNum);

  const BackLink = (
    <Link
      href="/pull-requests"
      className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"
    >
      <ChevronLeft size={26} className="-ml-1.5" />
      Pull Requests
    </Link>
  );

  if (h.isLoading) return <div className="min-h-screen"><AppBar title={BackLink} /><PageLoader /></div>;
  if (h.error || !h.pr) return <div className="min-h-screen"><AppBar title={BackLink} /><ErrorMessage message="PR konnte nicht geladen werden" error={h.error} /></div>;

  const pr = h.pr;

  return (
    <div className="min-h-screen">
      <AppBar title={BackLink} />

      {/* PR-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-2 mb-2 pt-4">
          <h1 className="text-base font-semibold text-slate-100 leading-snug flex-1">{pr.title}</h1>
          {pr.isDraft && <Badge variant="muted">Draft</Badge>}
        </div>

        {/* Branch-Info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-3">
          <span className="truncate max-w-[130px] bg-slate-800 px-2 py-0.5 rounded">{h.sourceBranch}</span>
          <GitMerge size={14} className="text-slate-500 flex-shrink-0" />
          <span className="truncate max-w-[130px] bg-slate-800 px-2 py-0.5 rounded">{h.targetBranch}</span>
        </div>

        {/* Ersteller und Datum */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{pr.createdBy.displayName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{timeAgo(pr.creationDate)}</span>
          </div>
        </div>

        {/* Aktionsknöpfe */}
        {pr.status === "active" && (
          <div className="flex rounded-2xl border border-slate-700/50 bg-slate-800/60 overflow-hidden">
            <button
              onClick={() => h.setApproveModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
            >
              <ThumbsUp size={14} /> Genehmigen
            </button>
            <div className="w-px bg-slate-700/50 flex-shrink-0" />
            <button
              onClick={() => h.voteMutation.mutate(-10)}
              disabled={h.voteMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              <ThumbsDown size={14} /> Ablehnen
            </button>
            <div className="w-px bg-slate-700/50 flex-shrink-0" />
            <button
              onClick={() => h.setCompleteModal(true)}
              disabled={h.mergeBlockers.length > 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GitMerge size={14} /> Abschließen
            </button>
          </div>
        )}
      </div>

      {/* Fehlermeldung für Aktionen */}
      {h.actionError && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-800/50 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{h.actionError}</p>
          <button onClick={() => h.setActionError(null)} className="text-red-400 hover:text-red-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <TabBar
        variant="underline"
        tabs={[
          { key: "uebersicht", label: "Übersicht", icon: <FileText size={14} /> },
          { key: "dateien", label: `Dateien${h.changes?.changeEntries ? ` (${h.changes.changeEntries.length})` : ""}`, icon: <FileText size={14} /> },
          { key: "commits", label: "Commits", icon: <GitCommit size={14} /> },
          { key: "kommentare", label: `Kommentare${h.commentThreads.length ? ` (${h.commentThreads.length})` : ""}`, icon: <MessageCircle size={14} /> },
        ]}
        activeKey={h.activeTab}
        onChange={(key) => h.setActiveTab(key as Tab)}
      />

      {/* Tab-Inhalt */}
      <div className="px-4 py-4">
        {h.activeTab === "uebersicht" && (
          <PRTabOverview
            pr={pr}
            policies={h.policies}
            mergeBlockers={h.mergeBlockers}
            onOpenReviewerModal={() => {
              h.setReviewerError(null);
              h.setPendingReviewer(null);
              h.setReviewerSearch("");
              h.setReviewerModalOpen(true);
            }}
            onToggleReviewerRequired={(reviewerId, isRequired) =>
              h.addReviewerMutation.mutate({ reviewerId, isRequired })
            }
            onRemoveReviewer={(reviewerId) => h.removeReviewerMutation.mutate(reviewerId)}
          />
        )}
        {h.activeTab === "dateien" && (
          <PRTabFiles
            changeEntries={h.changeEntries}
            selectedChange={h.selectedChange}
            onSelectChange={h.setSelectedChangeKey}
            selectedFileDiff={h.selectedFileDiff}
            selectedFileDiffLoading={h.selectedFileDiffLoading}
            sourceBranch={h.sourceBranch}
            targetBranch={h.targetBranch}
          />
        )}
        {h.activeTab === "kommentare" && (
          <PRTabComments
            commentThreads={h.commentThreads}
            commentText={h.commentText}
            setCommentText={h.setCommentText}
            addCommentPending={h.addCommentMutation.isPending}
            onAddComment={() => h.addCommentMutation.mutate()}
            currentUserId={h.currentUser?.id}
            onUpdateThreadStatus={(threadId, status) =>
              h.updateThreadStatusMutation.mutate({ threadId, status })
            }
            onEditComment={(threadId, commentId, content) =>
              h.editCommentMutation.mutate({ threadId, commentId, content })
            }
            onDeleteComment={(threadId, commentId) =>
              h.deleteCommentMutation.mutate({ threadId, commentId })
            }
            onReplyToThread={(threadId, content) =>
              h.replyToThreadMutation.mutate({ threadId, content })
            }
          />
        )}
        {h.activeTab === "commits" && (
          <PRTabCommits
            iterations={h.iterations}
            selectedIterationId={h.selectedIterationId}
            onSelectIteration={(id) => {
              h.setSelectedIterationId(id);
              h.setSelectedCommitChangeKey(null);
            }}
            commitChanges={h.commitChanges}
            selectedCommitChange={h.selectedCommitChange}
            onSelectCommitChange={h.setSelectedCommitChangeKey}
            commitFileDiff={h.commitFileDiff}
            commitFileDiffLoading={h.commitFileDiffLoading}
            commitOldCommitId={h.commitOldCommitId}
            commitNewCommitId={h.commitNewCommitId}
            commitOldPath={h.commitOldPath}
            commitNewPath={h.commitNewPath}
            commitSelectedChangeType={h.commitSelectedChangeType}
          />
        )}
      </div>

      {/* Modals */}
      <PRVoteModal
        open={h.approveModal}
        votePending={h.voteMutation.isPending}
        autoCompleteOnApprove={h.autoCompleteOnApprove}
        onToggleAutoComplete={() => h.setAutoCompleteOnApprove((v) => !v)}
        onClose={() => { h.setApproveModal(false); h.setAutoCompleteOnApprove(false); }}
        onVote={async (vote) => {
          await h.voteMutation.mutateAsync(vote);
          if (vote === 10 && h.autoCompleteOnApprove) h.autoCompleteMutation.mutate();
        }}
      />
      <PRCompleteModal
        open={h.completeModal}
        sourceBranch={h.sourceBranch}
        mergeStrategy={h.mergeStrategy}
        deleteSourceBranch={h.deleteSourceBranch}
        completePending={h.completeMutation.isPending}
        completeError={h.completeError}
        onChangeMergeStrategy={h.setMergeStrategy}
        onToggleDeleteBranch={() => h.setDeleteSourceBranch((v) => !v)}
        onClose={() => { h.setCompleteModal(false); h.setCompleteError(null); }}
        onComplete={() => h.completeMutation.mutate()}
      />
      <PRReviewerModal
        open={h.reviewerModalOpen}
        availableMembers={h.availableMembers}
        reviewerSearch={h.reviewerSearch}
        reviewerError={h.reviewerError}
        pendingReviewer={h.pendingReviewer}
        pendingIsRequired={h.pendingIsRequired}
        addPending={h.addReviewerMutation.isPending}
        onChangeSearch={(v) => { h.setReviewerSearch(v); h.setPendingReviewer(null); }}
        onSelectMember={(m) => { h.setPendingReviewer(m); h.setPendingIsRequired(false); }}
        onToggleRequired={() => h.setPendingIsRequired((v) => !v)}
        onAdd={(reviewerId, isRequired) => h.addReviewerMutation.mutate({ reviewerId, isRequired })}
        onClose={() => { h.setReviewerModalOpen(false); h.setReviewerSearch(""); h.setPendingReviewer(null); }}
      />
    </div>
  );
}
