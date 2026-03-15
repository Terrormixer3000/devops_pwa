import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { repositoriesService } from "@/lib/services/repositoriesService";
import { identityService } from "@/lib/services/identityService";
import { stripRefPrefix, getChangeKey } from "@/lib/utils/gitUtils";
import { isImagePath } from "@/lib/utils/fileTypes";
import type { PRThread } from "@/types";

/** Merge-Strategie-Optionen beim Abschließen eines Pull Requests. */
export type MergeStrategy = "noFastForward" | "squash" | "rebase" | "rebaseMerge";

/** Alle State, Queries, Mutations und berechneten Werte fuer die PR-Detailseite. */
export function usePRDetail(repoId: string, prIdNum: number) {
  const t = useTranslations("prOverview");
  const [activeTab, setActiveTab] = useState<"uebersicht" | "dateien" | "kommentare" | "commits">("uebersicht");
  const [commentText, setCommentText] = useState("");
  const [approveModal, setApproveModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("noFastForward");
  const [deleteSourceBranch, setDeleteSourceBranch] = useState(false);
  const [autoCompleteOnApprove, setAutoCompleteOnApprove] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [selectedChangeKey, setSelectedChangeKey] = useState<string | null>(null);
  const [selectedIterationId, setSelectedIterationId] = useState<number | null>(null);
  const [selectedCommitChangeKey, setSelectedCommitChangeKey] = useState<string | null>(null);
  const [reviewerModalOpen, setReviewerModalOpen] = useState(false);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewerError, setReviewerError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingReviewer, setPendingReviewer] = useState<{ id: string; displayName: string } | null>(null);
  const [pendingIsRequired, setPendingIsRequired] = useState(false);
  const [abandonModal, setAbandonModal] = useState(false);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();
  const router = useRouter();

  const { data: pr, isLoading, error } = useQuery({
    queryKey: ["pr", repoId, prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getPullRequest(client, settings.project, repoId, prIdNum)
      : Promise.reject(new Error("Kein Client")),
    enabled: !!client && !!settings,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user", settings?.demoMode],
    queryFn: () => client ? identityService.getCurrentUser(client) : Promise.reject(new Error("Kein Client")),
    enabled: !!client,
    staleTime: Infinity,
  });

  const { data: policies } = useQuery({
    queryKey: ["pr-policies", prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getPolicies(client, settings.project, prIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const { data: threads } = useQuery({
    queryKey: ["pr-threads", repoId, prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getThreads(client, settings.project, repoId, prIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const { data: iterations } = useQuery({
    queryKey: ["pr-iterations", repoId, prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getIterations(client, settings.project, repoId, prIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  const lastIterationId = iterations?.[iterations.length - 1]?.id;
  const { data: changes } = useQuery({
    queryKey: ["pr-changes", repoId, prIdNum, lastIterationId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && lastIterationId
      ? pullRequestsService.getIterationChanges(client, settings.project, repoId, prIdNum, lastIterationId)
      : Promise.resolve({ changeEntries: [] }),
    enabled: !!client && !!settings && !!lastIterationId,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? identityService.listTeamMembers(client, settings.project)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: commitChanges } = useQuery({
    queryKey: ["pr-commit-changes", repoId, prIdNum, selectedIterationId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && selectedIterationId
      ? pullRequestsService.getIterationChanges(client, settings.project, repoId, prIdNum, selectedIterationId)
      : Promise.resolve({ changeEntries: [] }),
    enabled: !!client && !!settings && !!selectedIterationId && activeTab === "commits",
  });

  // Berechnete Werte fuer den Commit-Diff
  const selectedCommitChange = commitChanges?.changeEntries.find(
    (e) => getChangeKey(e) === selectedCommitChangeKey
  ) || commitChanges?.changeEntries[0] || null;
  const selectedIterationIndex = iterations?.findIndex((i) => i.id === selectedIterationId) ?? -1;
  const commitOldCommitId =
    selectedIterationIndex > 0
      ? (iterations![selectedIterationIndex - 1].sourceRefCommit?.commitId || "")
      : (iterations?.[selectedIterationIndex]?.targetRefCommit?.commitId || "");
  const commitNewCommitId =
    iterations?.find((i) => i.id === selectedIterationId)?.sourceRefCommit?.commitId || "";
  const commitSelectedChangeType = selectedCommitChange?.changeType?.toLowerCase();
  const commitOldPath = selectedCommitChange?.originalPath || selectedCommitChange?.item.path || "";
  const commitNewPath = selectedCommitChange?.item.path || "";
  const commitSelectedPath = selectedCommitChange?.item.path || selectedCommitChange?.originalPath || "";
  const commitSelectedIsImage = isImagePath(commitSelectedPath);

  const { data: commitFileDiff, isLoading: commitFileDiffLoading } = useQuery({
    queryKey: [
      "pr-commit-file-diff", repoId, prIdNum, selectedIterationId, selectedCommitChangeKey,
      commitOldCommitId, commitNewCommitId, settings?.project, settings?.demoMode,
    ],
    queryFn: async () => {
      if (!client || !settings || !selectedCommitChange || !commitOldCommitId || !commitNewCommitId) {
        return { oldContent: "", newContent: "", oldImageDataUrl: null as string | null, newImageDataUrl: null as string | null, error: null as string | null };
      }
      const lowerType = selectedCommitChange.changeType.toLowerCase();
      const loadOld = lowerType !== "add";
      const loadNew = lowerType !== "delete";
      let oldContent = "";
      let newContent = "";
      let oldImageDataUrl: string | null = null;
      let newImageDataUrl: string | null = null;
      try {
        if (loadOld && commitOldPath) {
          if (commitSelectedIsImage) {
            oldImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(client, settings.project, repoId, commitOldPath, commitOldCommitId, "commit");
          } else {
            oldContent = await repositoriesService.getFileContentAtVersion(client, settings.project, repoId, commitOldPath, commitOldCommitId, "commit");
          }
        }
      } catch {
        if (loadOld) return { oldContent: "", newContent: "", oldImageDataUrl: null as string | null, newImageDataUrl: null as string | null, error: "Basisversion konnte nicht geladen werden." };
      }
      try {
        if (loadNew && commitNewPath) {
          if (commitSelectedIsImage) {
            newImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(client, settings.project, repoId, commitNewPath, commitNewCommitId, "commit");
          } else {
            newContent = await repositoriesService.getFileContentAtVersion(client, settings.project, repoId, commitNewPath, commitNewCommitId, "commit");
          }
        }
      } catch {
        if (loadNew) return { oldContent, newContent: "", oldImageDataUrl, newImageDataUrl: null as string | null, error: "Neue Version konnte nicht geladen werden." };
      }
      return { oldContent, newContent, oldImageDataUrl, newImageDataUrl, error: null as string | null };
    },
    enabled: !!client && !!settings && !!selectedCommitChange && !!commitOldCommitId && !!commitNewCommitId && activeTab === "commits",
  });

  // Berechnete Werte fuer den Datei-Diff (Dateien-Tab)
  const sourceBranch = pr?.sourceRefName ? stripRefPrefix(pr.sourceRefName) : "";
  const targetBranch = pr?.targetRefName ? stripRefPrefix(pr.targetRefName) : "";
  const changeEntries = changes?.changeEntries || [];
  const selectedChange = changeEntries.find((e) => getChangeKey(e) === selectedChangeKey) || changeEntries[0] || null;
  const selectedChangeType = selectedChange?.changeType?.toLowerCase();
  const oldPath = selectedChange?.originalPath || selectedChange?.item.path || "";
  const newPath = selectedChange?.item.path || "";
  const selectedPath = selectedChange?.item.path || selectedChange?.originalPath || "";
  const selectedChangeIsImage = isImagePath(selectedPath);

  const { data: selectedFileDiff, isLoading: selectedFileDiffLoading } = useQuery({
    queryKey: [
      "pr-file-diff", repoId, prIdNum, sourceBranch, targetBranch,
      selectedChange?.changeType, selectedChange?.originalPath, selectedChange?.item.path,
      settings?.project, settings?.demoMode,
    ],
    queryFn: async () => {
      if (!client || !settings || !selectedChange) {
        return { oldContent: "", newContent: "", oldImageDataUrl: null as string | null, newImageDataUrl: null as string | null, error: null as string | null };
      }
      const lowerType = selectedChange.changeType.toLowerCase();
      const loadOld = lowerType !== "add";
      const loadNew = lowerType !== "delete";
      let oldContent = "";
      let newContent = "";
      let oldImageDataUrl: string | null = null;
      let newImageDataUrl: string | null = null;
      try {
        if (loadOld && oldPath) {
          if (selectedChangeIsImage) {
            oldImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(client, settings.project, repoId, oldPath, targetBranch, "branch");
          } else {
            oldContent = await repositoriesService.getFileContent(client, settings.project, repoId, oldPath, targetBranch);
          }
        }
      } catch {
        if (loadOld) return { oldContent: "", newContent: "", oldImageDataUrl: null as string | null, newImageDataUrl: null as string | null, error: "Basisversion konnte nicht geladen werden." };
      }
      try {
        if (loadNew && newPath) {
          if (selectedChangeIsImage) {
            newImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(client, settings.project, repoId, newPath, sourceBranch, "branch");
          } else {
            newContent = await repositoriesService.getFileContent(client, settings.project, repoId, newPath, sourceBranch);
          }
        }
      } catch {
        if (loadNew) return { oldContent, newContent: "", oldImageDataUrl, newImageDataUrl: null as string | null, error: "Neue Version konnte nicht geladen werden." };
      }
      return { oldContent, newContent, oldImageDataUrl, newImageDataUrl, error: null as string | null };
    },
    enabled: !!client && !!settings && !!selectedChange && activeTab === "dateien",
  });

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.addComment(client, settings.project, repoId, prIdNum, commentText);
    },
    onSuccess: () => { setCommentText(""); qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }); },
    onError: (err: Error) => setActionError(err.message),
  });

  const updateThreadStatusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: number; status: PRThread["status"] }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.updateThreadStatus(client, settings.project, repoId, prIdNum, threadId, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
    onError: (err: Error) => setActionError(err.message),
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ threadId, commentId, content }: { threadId: number; commentId: number; content: string }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.editComment(client, settings.project, repoId, prIdNum, threadId, commentId, content);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
    onError: (err: Error) => setActionError(err.message),
  });

  const replyToThreadMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: number; content: string }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.replyToThread(client, settings.project, repoId, prIdNum, threadId, content);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
    onError: (err: Error) => setActionError(err.message),
  });

  const addReviewerMutation = useMutation({
    mutationFn: ({ reviewerId, isRequired }: { reviewerId: string; isRequired: boolean }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.addReviewer(client, settings.project, repoId, prIdNum, reviewerId, isRequired);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] });
      setReviewerModalOpen(false);
      setReviewerSearch("");
      setPendingReviewer(null);
      setReviewerError(null);
    },
    onError: (err: Error) => setReviewerError(err.message || "Reviewer konnte nicht hinzugefügt werden."),
  });

  const removeReviewerMutation = useMutation({
    mutationFn: (reviewerId: string) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.removeReviewer(client, settings.project, repoId, prIdNum, reviewerId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] }),
    onError: (err: Error) => setActionError(err.message),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ threadId, commentId }: { threadId: number; commentId: number }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.deleteComment(client, settings.project, repoId, prIdNum, threadId, commentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
    onError: (err: Error) => setActionError(err.message),
  });

  const voteMutation = useMutation({
    mutationFn: (vote: number) => {
      if (!client || !settings) throw new Error("Kein Client");
      const reviewerId = currentUser?.id || "me";
      return pullRequestsService.vote(client, settings.project, repoId, prIdNum, reviewerId, vote);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] }); setApproveModal(false); setAutoCompleteOnApprove(false); },
    onError: (err: Error) => setActionError(err.message),
  });

  const autoCompleteMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !currentUser) throw new Error("Kein Client");
      return pullRequestsService.enableAutoComplete(client, settings.project, repoId, prIdNum, currentUser.id, { mergeStrategy, deleteSourceBranch });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] }),
    onError: (err: Error) => setActionError(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !pr) throw new Error("Kein Client");
      return pullRequestsService.complete(client, settings.project, repoId, prIdNum, pr.sourceRefName, deleteSourceBranch, mergeStrategy);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] }); setCompleteModal(false); setCompleteError(null); },
    onError: (err: Error) => setCompleteError(err.message || t("blockerMergeFailed")),
  });

  // PR aufgeben (abandon)
  const abandonMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.abandonPR(client, settings.project, repoId, prIdNum);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] });
      setAbandonModal(false);
      router.back();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  // Merge-Blocker ableiten
  const mergeBlockers: string[] = [];
  if (pr) {
    if (pr.isDraft) mergeBlockers.push(t("blockerDraft"));
    if (pr.mergeStatus === "conflicts") mergeBlockers.push(t("blockerConflicts"));
    if (pr.mergeStatus === "rejectedByPolicy") mergeBlockers.push(t("blockerRejectedByPolicy"));
    if (pr.mergeStatus === "failure") mergeBlockers.push(t("blockerMergeFailed"));
    for (const r of pr.reviewers) {
      if (r.isRequired && r.vote < 0) mergeBlockers.push(t("blockerReviewerRejected", { name: r.displayName }));
      else if (r.isRequired && r.vote === 0) mergeBlockers.push(t("blockerReviewerPending", { name: r.displayName }));
    }
  }
  if (policies) {
    for (const p of policies) {
      if (!p.isRequired) continue;
      if (p.status === "rejected") mergeBlockers.push(t("blockerPolicyFailed", { name: p.displayName }));
      else if (p.status === "queued" || p.status === "running") mergeBlockers.push(t("blockerPolicyPending", { name: p.displayName }));
    }
  }
  const unresolvedCommentCount = threads
    ? threads.filter((th) => (th.status === "active" || th.status === "pending") && th.comments.some((c) => c.commentType === "text")).length
    : 0;
  if (unresolvedCommentCount > 0) {
    mergeBlockers.push(unresolvedCommentCount === 1
      ? t("blockerUnresolvedComments", { count: unresolvedCommentCount })
      : t("blockerUnresolvedCommentsPlural", { count: unresolvedCommentCount }));
  }

  // Verfügbare Mitglieder fuer Reviewer-Modal
  const availableMembers = (teamMembers || [])
    .filter((m) => !pr?.reviewers.some((r) => r.id === m.id))
    .filter((m) => !reviewerSearch
      || m.displayName.toLowerCase().includes(reviewerSearch.toLowerCase())
      || (m.uniqueName || "").toLowerCase().includes(reviewerSearch.toLowerCase())
    );

  const commentThreads = threads?.filter((t) => t.comments.some((c) => c.commentType === "text")) || [];

  return {
    // State
    activeTab, setActiveTab,
    commentText, setCommentText,
    approveModal, setApproveModal,
    completeModal, setCompleteModal,
    mergeStrategy, setMergeStrategy,
    deleteSourceBranch, setDeleteSourceBranch,
    autoCompleteOnApprove, setAutoCompleteOnApprove,
    completeError, setCompleteError,
    selectedChangeKey, setSelectedChangeKey,
    selectedIterationId, setSelectedIterationId,
    selectedCommitChangeKey, setSelectedCommitChangeKey,
    reviewerModalOpen, setReviewerModalOpen,
    reviewerSearch, setReviewerSearch,
    reviewerError, setReviewerError,
    actionError, setActionError,
    pendingReviewer, setPendingReviewer,
    pendingIsRequired, setPendingIsRequired,
    abandonModal, setAbandonModal,
    // Queries
    pr, isLoading, error,
    currentUser, policies, threads, iterations, changes, teamMembers,
    commitChanges, commitFileDiff, commitFileDiffLoading,
    selectedFileDiff, selectedFileDiffLoading,
    // Berechnete Werte
    sourceBranch, targetBranch,
    changeEntries, selectedChange, selectedChangeType, oldPath, newPath,
    commentThreads, mergeBlockers, availableMembers,
    selectedCommitChange, commitOldCommitId, commitNewCommitId,
    commitOldPath, commitNewPath, commitSelectedChangeType,
    // Mutations
    addCommentMutation, updateThreadStatusMutation, editCommentMutation,
    replyToThreadMutation, addReviewerMutation, removeReviewerMutation,
    deleteCommentMutation, voteMutation, autoCompleteMutation, completeMutation,
    abandonMutation,
  };
}
