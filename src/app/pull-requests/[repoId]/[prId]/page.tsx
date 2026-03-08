"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AppBar } from "@/components/layout/AppBar";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useAzureClient } from "@/lib/hooks/useAzureClient";
import { pullRequestsService } from "@/lib/services/pullRequestsService";
import { repositoriesService, GitChangeEntry } from "@/lib/services/repositoriesService";
import { identityService } from "@/lib/services/identityService";
import { PRThread, PRComment } from "@/types";
import { RichDiffViewer } from "@/components/ui/RichDiffViewer";
import { isImagePath } from "@/lib/utils/fileTypes";
import {
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  GitMerge,
  Send,
  FileText,
  GitCommit,
  Clock,
  User,
  ChevronRight,
  ShieldCheck,
  Zap,
  AlertCircle,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  RotateCcw,
  UserPlus,
  X,
} from "lucide-react";

type Tab = "uebersicht" | "dateien" | "kommentare" | "commits";

function getChangeKey(entry: GitChangeEntry): string {
  return `${entry.changeType}::${entry.originalPath || ""}::${entry.item.path}`;
}

export default function PRDetailPage({ params }: { params: Promise<{ repoId: string; prId: string }> }) {
  const { repoId, prId } = use(params);
  const prIdNum = parseInt(prId);
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [commentText, setCommentText] = useState("");
  const [approveModal, setApproveModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<"noFastForward" | "squash" | "rebase" | "rebaseMerge">("noFastForward");
  const [deleteSourceBranch, setDeleteSourceBranch] = useState(false);
  const [autoCompleteOnApprove, setAutoCompleteOnApprove] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [selectedChangeKey, setSelectedChangeKey] = useState<string | null>(null);
  const [selectedIterationId, setSelectedIterationId] = useState<number | null>(null);
  const [selectedCommitChangeKey, setSelectedCommitChangeKey] = useState<string | null>(null);
  const [reviewerModalOpen, setReviewerModalOpen] = useState(false);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewerError, setReviewerError] = useState<string | null>(null);
  const [pendingReviewer, setPendingReviewer] = useState<{ id: string; displayName: string } | null>(null);
  const [pendingIsRequired, setPendingIsRequired] = useState(false);

  const { settings } = useSettingsStore();
  const { client } = useAzureClient();
  const qc = useQueryClient();

  // PR-Details laden
  const { data: pr, isLoading, error } = useQuery({
    queryKey: ["pr", repoId, prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getPullRequest(client, settings.project, repoId, prIdNum)
      : Promise.reject(new Error("Kein Client")),
    enabled: !!client && !!settings,
  });

  // Aktuelle Benutzer-ID laden (fuer korrekte Vote-Zuordnung)
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", settings?.demoMode],
    queryFn: () => client ? identityService.getCurrentUser(client) : Promise.reject(new Error("Kein Client")),
    enabled: !!client,
    staleTime: Infinity,
  });

  // PR-Policies laden
  const { data: policies } = useQuery({
    queryKey: ["pr-policies", prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getPolicies(client, settings.project, prIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Kommentare / Threads laden
  const { data: threads } = useQuery({
    queryKey: ["pr-threads", repoId, prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getThreads(client, settings.project, repoId, prIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Iterations laden (fuer Dateiliste)
  const { data: iterations } = useQuery({
    queryKey: ["pr-iterations", repoId, prIdNum, settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? pullRequestsService.getIterations(client, settings.project, repoId, prIdNum)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
  });

  // Letzte Iteration: geaenderte Dateien
  const lastIterationId = iterations?.[iterations.length - 1]?.id;
  const { data: changes } = useQuery({
    queryKey: ["pr-changes", repoId, prIdNum, lastIterationId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && lastIterationId
      ? pullRequestsService.getIterationChanges(client, settings.project, repoId, prIdNum, lastIterationId)
      : Promise.resolve({ changeEntries: [] }),
    enabled: !!client && !!settings && !!lastIterationId,
  });

  // Team-Mitglieder fuer Reviewer-Picker
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", settings?.project, settings?.demoMode],
    queryFn: () => client && settings
      ? identityService.listTeamMembers(client, settings.project)
      : Promise.resolve([]),
    enabled: !!client && !!settings,
    staleTime: 5 * 60 * 1000,
  });

  // Dateiliste fuer gewaehlte Iteration (Commits-Tab)
  const { data: commitChanges } = useQuery({
    queryKey: ["pr-commit-changes", repoId, prIdNum, selectedIterationId, settings?.project, settings?.demoMode],
    queryFn: () => client && settings && selectedIterationId
      ? pullRequestsService.getIterationChanges(client, settings.project, repoId, prIdNum, selectedIterationId)
      : Promise.resolve({ changeEntries: [] }),
    enabled: !!client && !!settings && !!selectedIterationId && activeTab === "commits",
  });

  // Derived values fuer Commit-Diff
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

  // Diff fuer gewaehlte Datei in der Iteration
  const { data: commitFileDiff, isLoading: commitFileDiffLoading } = useQuery({
    queryKey: [
      "pr-commit-file-diff",
      repoId,
      prIdNum,
      selectedIterationId,
      selectedCommitChangeKey,
      commitOldCommitId,
      commitNewCommitId,
      settings?.project,
      settings?.demoMode,
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

  // Kommentar hinzufuegen
  const addCommentMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.addComment(client, settings.project, repoId, prIdNum, commentText);
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] });
    },
  });

  // Thread-Status aendern (resolve / reopen)
  const updateThreadStatusMutation = useMutation({
    mutationFn: ({ threadId, status }: { threadId: number; status: PRThread["status"] }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.updateThreadStatus(client, settings.project, repoId, prIdNum, threadId, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
  });

  // Eigenen Kommentar bearbeiten
  const editCommentMutation = useMutation({
    mutationFn: ({ threadId, commentId, content }: { threadId: number; commentId: number; content: string }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.editComment(client, settings.project, repoId, prIdNum, threadId, commentId, content);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
  });

  // Auf Thread antworten
  const replyToThreadMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: number; content: string }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.replyToThread(client, settings.project, repoId, prIdNum, threadId, content);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
  });

  // Reviewer hinzufuegen / aktualisieren
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

  // Reviewer entfernen
  const removeReviewerMutation = useMutation({
    mutationFn: (reviewerId: string) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.removeReviewer(client, settings.project, repoId, prIdNum, reviewerId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] }),
  });

  // Eigenen Kommentar loeschen
  const deleteCommentMutation = useMutation({
    mutationFn: ({ threadId, commentId }: { threadId: number; commentId: number }) => {
      if (!client || !settings) throw new Error("Kein Client");
      return pullRequestsService.deleteComment(client, settings.project, repoId, prIdNum, threadId, commentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr-threads", repoId, prIdNum] }),
  });

  // Abstimmen (Approve / Reject)
  const voteMutation = useMutation({
    mutationFn: (vote: number) => {
      if (!client || !settings) throw new Error("Kein Client");
      // Echte User-ID aus identityService verwenden
      const reviewerId = currentUser?.id || "me";
      return pullRequestsService.vote(client, settings.project, repoId, prIdNum, reviewerId, vote);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] });
      setApproveModal(false);
      setAutoCompleteOnApprove(false);
    },
  });

  // Auto-Complete aktivieren
  const autoCompleteMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !currentUser) throw new Error("Kein Client");
      return pullRequestsService.enableAutoComplete(
        client,
        settings.project,
        repoId,
        prIdNum,
        currentUser.id,
        { mergeStrategy, deleteSourceBranch }
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] }),
  });

  // PR abschliessen
  const completeMutation = useMutation({
    mutationFn: () => {
      if (!client || !settings || !pr) throw new Error("Kein Client");
      return pullRequestsService.complete(
        client,
        settings.project,
        repoId,
        prIdNum,
        pr.sourceRefName,
        deleteSourceBranch,
        mergeStrategy
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] });
      setCompleteModal(false);
      setCompleteError(null);
    },
    onError: (err: Error) => {
      setCompleteError(err.message || "Merge fehlgeschlagen.");
    },
  });

  // Merge-Blocker aus vorhandenen Daten ableiten (kein extra API-Aufruf noetig)
  const mergeBlockers: string[] = [];
  if (pr) {
    if (pr.isDraft) mergeBlockers.push("PR ist ein Draft");
    if (pr.mergeStatus === "conflicts") mergeBlockers.push("Merge-Konflikte vorhanden");
    if (pr.mergeStatus === "rejectedByPolicy") mergeBlockers.push("PR durch Policy abgelehnt");
    if (pr.mergeStatus === "failure") mergeBlockers.push("Merge fehlgeschlagen");
    for (const r of pr.reviewers) {
      if (r.isRequired && r.vote < 0)
        mergeBlockers.push(`Reviewer abgelehnt: ${r.displayName}`);
      else if (r.isRequired && r.vote === 0)
        mergeBlockers.push(`Reviewer ausstehend: ${r.displayName}`);
    }
  }
  if (policies) {
    for (const p of policies) {
      if (!p.isRequired) continue;
      if (p.status === "rejected")
        mergeBlockers.push(`Policy fehlgeschlagen: ${p.displayName}`);
      else if (p.status === "queued" || p.status === "running")
        mergeBlockers.push(`Policy ausstehend: ${p.displayName}`);
    }
  }
  const unresolvedCommentCount = threads
    ? threads.filter(
        (t) =>
          (t.status === "active" || t.status === "pending") &&
          t.comments.some((c) => c.commentType === "text")
      ).length
    : 0;
  if (unresolvedCommentCount > 0)
    mergeBlockers.push(
      `${unresolvedCommentCount} ungelöste${unresolvedCommentCount === 1 ? "r" : ""} Kommentar${unresolvedCommentCount === 1 ? "" : "e"}`
    );

  // Verfuegbare Team-Mitglieder fuer Reviewer-Modal (noch kein Reviewer, passend zur Suche)
  const availableMembers = (teamMembers || [])
    .filter((m) => !pr?.reviewers.some((r) => r.id === m.id))
    .filter((m) =>
      !reviewerSearch ||
      m.displayName.toLowerCase().includes(reviewerSearch.toLowerCase()) ||
      (m.uniqueName || "").toLowerCase().includes(reviewerSearch.toLowerCase())
    );

  const sourceBranch = pr?.sourceRefName.replace("refs/heads/", "") || "";
  const targetBranch = pr?.targetRefName.replace("refs/heads/", "") || "";
  const commentThreads = threads?.filter((t) => t.comments.some((c) => c.commentType === "text")) || [];
  const changeEntries = changes?.changeEntries || [];
  const selectedChange = changeEntries.find((entry) => getChangeKey(entry) === selectedChangeKey) || changeEntries[0] || null;
  const selectedChangeType = selectedChange?.changeType?.toLowerCase();
  const oldPath = selectedChange?.originalPath || selectedChange?.item.path || "";
  const newPath = selectedChange?.item.path || "";
  const selectedPath = selectedChange?.item.path || selectedChange?.originalPath || "";
  const selectedChangeIsImage = isImagePath(selectedPath);

  const { data: selectedFileDiff, isLoading: selectedFileDiffLoading } = useQuery({
    queryKey: [
      "pr-file-diff",
      repoId,
      prIdNum,
      sourceBranch,
      targetBranch,
      selectedChange?.changeType,
      selectedChange?.originalPath,
      selectedChange?.item.path,
      settings?.project,
      settings?.demoMode,
    ],
    queryFn: async () => {
      if (!client || !settings || !selectedChange) {
        return {
          oldContent: "",
          newContent: "",
          oldImageDataUrl: null as string | null,
          newImageDataUrl: null as string | null,
          error: null as string | null,
        };
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
            oldImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(
              client,
              settings.project,
              repoId,
              oldPath,
              targetBranch,
              "branch"
            );
          } else {
            oldContent = await repositoriesService.getFileContent(
              client,
              settings.project,
              repoId,
              oldPath,
              targetBranch
            );
          }
        }
      } catch {
        if (loadOld) {
          return {
            oldContent: "",
            newContent: "",
            oldImageDataUrl: null as string | null,
            newImageDataUrl: null as string | null,
            error: "Basisversion konnte nicht geladen werden.",
          };
        }
      }

      try {
        if (loadNew && newPath) {
          if (selectedChangeIsImage) {
            newImageDataUrl = await repositoriesService.getFileBinaryDataUrlAtVersion(
              client,
              settings.project,
              repoId,
              newPath,
              sourceBranch,
              "branch"
            );
          } else {
            newContent = await repositoriesService.getFileContent(
              client,
              settings.project,
              repoId,
              newPath,
              sourceBranch
            );
          }
        }
      } catch {
        if (loadNew) {
          return {
            oldContent,
            newContent: "",
            oldImageDataUrl,
            newImageDataUrl: null as string | null,
            error: "Neue Version konnte nicht geladen werden.",
          };
        }
      }

      return { oldContent, newContent, oldImageDataUrl, newImageDataUrl, error: null as string | null };
    },
    enabled: !!client && !!settings && !!selectedChange && activeTab === "dateien",
  });

  if (isLoading) return <div className="min-h-screen"><AppBar title={<Link href="/pull-requests" className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"><ChevronLeft size={26} className="-ml-1.5" />Pull Requests</Link>} /><PageLoader /></div>;
  if (error || !pr) return <div className="min-h-screen"><AppBar title={<Link href="/pull-requests" className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"><ChevronLeft size={26} className="-ml-1.5" />Pull Requests</Link>} /><ErrorMessage message="PR konnte nicht geladen werden" /></div>;

  return (
    <div className="min-h-screen">
      <AppBar title={<Link href="/pull-requests" className="flex items-center gap-0.5 text-[18px] font-semibold tracking-[-0.01em] text-slate-100 active:opacity-70 transition-opacity"><ChevronLeft size={26} className="-ml-1.5" />Pull Requests</Link>} />

      {/* Zurueck-Link */}
      <div className="px-4 pt-4">
      </div>

      {/* PR-Kopfbereich */}
      <div className="px-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-2 mb-2">
          <h1 className="text-base font-semibold text-slate-100 leading-snug flex-1">{pr.title}</h1>
          {pr.isDraft && <Badge variant="muted">Draft</Badge>}
        </div>

        {/* Branch-Info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-3">
          <span className="truncate max-w-[130px] bg-slate-800 px-2 py-0.5 rounded">{sourceBranch}</span>
          <GitMerge size={14} className="text-slate-500 flex-shrink-0" />
          <span className="truncate max-w-[130px] bg-slate-800 px-2 py-0.5 rounded">{targetBranch}</span>
        </div>

        {/* Ersteller und Datum */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{pr.createdBy.displayName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatDistanceToNow(new Date(pr.creationDate), { addSuffix: true, locale: de })}</span>
          </div>
        </div>

        {/* Aktionsknopfe (nur fuer aktive PRs) */}
        {pr.status === "active" && (
          <div className="flex rounded-2xl border border-slate-700/50 bg-slate-800/60 overflow-hidden">
            <button
              onClick={() => setApproveModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
            >
              <ThumbsUp size={14} /> Approven
            </button>
            <div className="w-px bg-slate-700/50 flex-shrink-0" />
            <button
              onClick={() => voteMutation.mutate(-10)}
              disabled={voteMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              <ThumbsDown size={14} /> Ablehnen
            </button>
            <div className="w-px bg-slate-700/50 flex-shrink-0" />
            <button
              onClick={() => setCompleteModal(true)}
              disabled={mergeBlockers.length > 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GitMerge size={14} /> Complete
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex overflow-x-auto hide-scrollbar px-4">
          {(([
            { key: "uebersicht", label: "Uebersicht", icon: FileText },
            { key: "dateien", label: `Dateien${changes?.changeEntries ? ` (${changes.changeEntries.length})` : ""}`, icon: FileText },
            { key: "commits", label: "Commits", icon: GitCommit },
          ]) as Array<{ key: Tab; label: string; icon: typeof FileText }>).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                activeTab === key ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
          {/* Kommentare-Tab mit optionalem rotem Badge */}
          <button
            onClick={() => setActiveTab("kommentare")}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
              activeTab === "kommentare" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <MessageCircle size={14} />
            Kommentare{commentThreads.length ? ` (${commentThreads.length})` : ""}
          </button>
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div className="px-4 py-4">
        {activeTab === "uebersicht" && (
          <div className="space-y-4">
            {/* Merge-Blocker */}
            {pr.status === "active" && mergeBlockers.length > 0 && (
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
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Beschreibung</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{pr.description}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Keine Beschreibung</p>
            )}

            {/* Reviewer */}
            {(pr.reviewers.length > 0 || pr.status === "active") && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reviewer</h3>
                  {pr.status === "active" && (
                    <button
                      onClick={() => { setReviewerError(null); setPendingReviewer(null); setReviewerSearch(""); setReviewerModalOpen(true); }}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <UserPlus size={13} /> Hinzufügen
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {pr.reviewers.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/40">
                      <span className="text-sm text-slate-300 flex-1 truncate">{r.displayName}</span>
                      <VoteBadge vote={r.vote} />
                      {pr.status === "active" && (
                        <>
                          <button
                            onClick={() => addReviewerMutation.mutate({ reviewerId: r.id, isRequired: !r.isRequired })}
                            title={r.isRequired ? "Als Optional setzen" : "Als Pflicht setzen"}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${
                              r.isRequired
                                ? "border-red-700/60 text-red-400 hover:bg-red-900/30"
                                : "border-slate-600 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {r.isRequired ? "Pflicht" : "Optional"}
                          </button>
                          <button
                            onClick={() => removeReviewerMutation.mutate(r.id)}
                            className="p-1 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                            title="Entfernen"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {pr.reviewers.length === 0 && (
                    <p className="text-sm text-slate-500 py-1 px-2">Noch keine Reviewer</p>
                  )}
                </div>
              </div>
            )}

            {/* Policy Checks */}
            {policies && policies.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck size={12} /> Policy-Checks
                </h3>
                <div className="space-y-1.5">
                  {policies.map((policy) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      approved: { label: "Bestanden", cls: "text-green-400" },
                      rejected: { label: "Fehlgeschlagen", cls: "text-red-400" },
                      queued: { label: "Wartend", cls: "text-yellow-400" },
                      running: { label: "Laufend", cls: "text-blue-400" },
                      notApplicable: { label: "N/A", cls: "text-slate-500" },
                    };
                    const s = statusMap[policy.status] || { label: policy.status, cls: "text-slate-400" };
                    return (
                      <div key={policy.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg">
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
        )}

        {activeTab === "dateien" && (
          <div className="space-y-3">
            {changes?.changeEntries.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Keine geaenderten Dateien</p>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-slate-700/60">
                  {changes?.changeEntries.map((entry, i) => {
                    const entryKey = getChangeKey(entry);
                    const isSelected = selectedChange ? getChangeKey(selectedChange) === entryKey : false;
                    return (
                      <button
                        key={`${entry.item.path}-${entry.changeType}-${i}`}
                        onClick={() => setSelectedChangeKey(entryKey)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/50 text-left transition-colors ${
                          isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                        }`}
                      >
                        <ChangeTypeDot type={entry.changeType} />
                        <span className="text-xs font-mono text-slate-300 truncate flex-1">{entry.item.path}</span>
                        <ChevronRight size={14} className={`flex-shrink-0 ${isSelected ? "text-blue-400" : "text-slate-600"}`} />
                      </button>
                    );
                  })}
                </div>

                {selectedChange && (
                  <RichDiffViewer
                    key={`${selectedChange.item.path}:${selectedChange.changeType}:${selectedChange.originalPath || ""}`}
                    path={selectedChange.item.path}
                    title={selectedChange.item.path}
                    oldContent={selectedFileDiff?.oldContent || ""}
                    newContent={selectedFileDiff?.newContent || ""}
                    oldLabel={`${targetBranch}:${oldPath}`}
                    newLabel={`${sourceBranch}:${newPath}`}
                    oldImageSrc={selectedFileDiff?.oldImageDataUrl || null}
                    newImageSrc={selectedFileDiff?.newImageDataUrl || null}
                    loading={selectedFileDiffLoading}
                    error={selectedFileDiff?.error}
                    emptyMessage={selectedChangeType === "rename" ? "Nur Umbenennung ohne Inhaltsaenderung" : "Keine zeilenbasierten Unterschiede"}
                  />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "kommentare" && (
          <div className="space-y-4">
            {/* Kommentar-Liste */}
            {commentThreads.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Noch keine Kommentare</p>
            ) : (
              commentThreads.map((thread) => (
                <CommentThread
                  key={thread.id}
                  thread={thread}
                  currentUserId={currentUser?.id}
                  onUpdateStatus={(status) => updateThreadStatusMutation.mutate({ threadId: thread.id, status })}
                  onEditComment={(commentId, content) => editCommentMutation.mutate({ threadId: thread.id, commentId, content })}
                  onDeleteComment={(commentId) => deleteCommentMutation.mutate({ threadId: thread.id, commentId })}
                  onReply={(content) => replyToThreadMutation.mutate({ threadId: thread.id, content })}
                />
              ))
            )}

            {/* Neuer Kommentar */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Neuer Kommentar</h3>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Kommentar schreiben..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <Button
                size="sm"
                disabled={!commentText.trim()}
                loading={addCommentMutation.isPending}
                onClick={() => addCommentMutation.mutate()}
                className="self-end"
              >
                <Send size={14} />
                Senden
              </Button>
            </div>
          </div>
        )}

        {activeTab === "commits" && (
          selectedIterationId ? (
            <div className="space-y-3">
              {/* Zurueck zur Iterationsliste */}
              <button
                onClick={() => { setSelectedIterationId(null); setSelectedCommitChangeKey(null); }}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft size={16} /> Alle Commits
              </button>

              {/* Dateiliste fuer diese Iteration */}
              {commitChanges?.changeEntries && commitChanges.changeEntries.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-700/60">
                  {commitChanges.changeEntries.map((entry, i) => {
                    const entryKey = getChangeKey(entry);
                    const isSelected = selectedCommitChange ? getChangeKey(selectedCommitChange) === entryKey : false;
                    return (
                      <button
                        key={`${entry.item.path}-${entry.changeType}-${i}`}
                        onClick={() => setSelectedCommitChangeKey(entryKey)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/50 text-left transition-colors last:border-b-0 ${
                          isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                        }`}
                      >
                        <ChangeTypeDot type={entry.changeType} />
                        <span className="text-xs font-mono text-slate-300 truncate flex-1">{entry.item.path}</span>
                        <ChevronRight size={14} className={`flex-shrink-0 ${isSelected ? "text-blue-400" : "text-slate-600"}`} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Keine geaenderten Dateien</p>
              )}

              {/* Diff-Viewer */}
              {selectedCommitChange && (
                <RichDiffViewer
                  key={`commit:${selectedIterationId}:${selectedCommitChange.item.path}:${selectedCommitChange.changeType}`}
                  path={selectedCommitChange.item.path}
                  title={selectedCommitChange.item.path}
                  oldContent={commitFileDiff?.oldContent || ""}
                  newContent={commitFileDiff?.newContent || ""}
                  oldLabel={`${commitOldCommitId.substring(0, 8)}:${commitOldPath}`}
                  newLabel={`${commitNewCommitId.substring(0, 8)}:${commitNewPath}`}
                  oldImageSrc={commitFileDiff?.oldImageDataUrl || null}
                  newImageSrc={commitFileDiff?.newImageDataUrl || null}
                  loading={commitFileDiffLoading}
                  error={commitFileDiff?.error}
                  emptyMessage={commitSelectedChangeType === "rename" ? "Nur Umbenennung ohne Inhaltsaenderung" : "Keine zeilenbasierten Unterschiede"}
                />
              )}
            </div>
          ) : (
            // Iterationsliste – klickbar
            <div className="space-y-2">
              {iterations?.map((iter) => (
                <button
                  key={iter.id}
                  onClick={() => { setSelectedIterationId(iter.id); setSelectedCommitChangeKey(null); }}
                  className="w-full p-3 bg-slate-800/60 rounded-xl text-left hover:bg-slate-800 transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <GitCommit size={14} className="text-blue-400 flex-shrink-0" />
                    <span className="font-mono truncate">{iter.sourceRefCommit?.commitId?.substring(0, 8)}</span>
                    <span className="ml-auto flex-shrink-0">{formatDistanceToNow(new Date(iter.createdDate), { addSuffix: true, locale: de })}</span>
                    <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                  </div>
                  {iter.description && <p className="text-sm text-slate-300 mt-1">{iter.description}</p>}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Approve Modal */}
      <Modal open={approveModal} onClose={() => { setApproveModal(false); setAutoCompleteOnApprove(false); }} title="Pull Request bewerten">
        <div className="space-y-3">
          <Button fullWidth onClick={async () => { await voteMutation.mutateAsync(10); if (autoCompleteOnApprove) autoCompleteMutation.mutate(); }} loading={voteMutation.isPending}>
            <ThumbsUp size={16} /> Approven
          </Button>
          <Button fullWidth variant="secondary" onClick={() => voteMutation.mutate(5)} loading={voteMutation.isPending}>
            Approven mit Vorbehalten
          </Button>
          <Button fullWidth variant="ghost" onClick={() => voteMutation.mutate(-5)} loading={voteMutation.isPending}>
            Warten auf Autor
          </Button>

          {/* Auto-Complete Toggle */}
          <div className="flex items-center justify-between py-2.5 px-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              <div>
                <p className="text-sm text-slate-200">Auto-Complete</p>
                <p className="text-xs text-slate-500">Automatisch mergen wenn alle Policies bestanden</p>
              </div>
            </div>
            <button
              onClick={() => setAutoCompleteOnApprove((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                autoCompleteOnApprove ? "bg-blue-600" : "bg-slate-700"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                autoCompleteOnApprove ? "translate-x-7" : "translate-x-1"
              }`} />
            </button>
          </div>

          <Button fullWidth variant="danger" onClick={() => voteMutation.mutate(-10)} loading={voteMutation.isPending}>
            <ThumbsDown size={16} /> Ablehnen
          </Button>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={completeModal} onClose={() => { setCompleteModal(false); setCompleteError(null); }} title="PR abschliessen">
        <div className="space-y-4">
          {/* Merge-Strategie */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Merge-Strategie</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "noFastForward" as const, label: "Merge", desc: "Merge-Commit" },
                { key: "squash" as const, label: "Squash", desc: "Ein Commit" },
                { key: "rebase" as const, label: "Rebase", desc: "Linear" },
                { key: "rebaseMerge" as const, label: "Rebase+Merge", desc: "Rebase mit Merge" },
              ]).map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setMergeStrategy(key)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    mergeStrategy === key
                      ? "border-blue-500 bg-blue-500/15 text-blue-300"
                      : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quell-Branch loeschen */}
          <div className="flex items-center justify-between py-3 border-t border-slate-800">
            <div>
              <p className="text-sm text-slate-300">Quell-Branch loeschen</p>
              <p className="text-xs text-slate-500">{sourceBranch}</p>
            </div>
            <button
              onClick={() => setDeleteSourceBranch((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${deleteSourceBranch ? "bg-blue-600" : "bg-slate-700"}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${deleteSourceBranch ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>

          {completeError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{completeError}</p>
            </div>
          )}
          <Button
            fullWidth
            onClick={() => completeMutation.mutate()}
            loading={completeMutation.isPending}
          >
            <GitMerge size={16} />
            Jetzt mergen
          </Button>
          <Button fullWidth variant="ghost" onClick={() => setCompleteModal(false)}>
            Abbrechen
          </Button>
        </div>
      </Modal>

      {/* Reviewer hinzufügen Modal */}
      <Modal
        open={reviewerModalOpen}
        onClose={() => { setReviewerModalOpen(false); setReviewerSearch(""); setPendingReviewer(null); }}
        title="Reviewer hinzufügen"
      >
        <div className="space-y-3">
          {reviewerError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{reviewerError}</p>
            </div>
          )}
          <input
            type="text"
            value={reviewerSearch}
            onChange={(e) => { setReviewerSearch(e.target.value); setPendingReviewer(null); }}
            placeholder="Name suchen..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500"
          />
          <div className="max-h-56 overflow-y-auto space-y-1">
            {availableMembers.map((m) => (
              <div key={m.id}>
                <button
                  onClick={() => { setPendingReviewer(pendingReviewer?.id === m.id ? null : { id: m.id, displayName: m.displayName }); setPendingIsRequired(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${pendingReviewer?.id === m.id ? "bg-slate-700" : "hover:bg-slate-800"}`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-slate-300">{m.displayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{m.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{m.uniqueName}</p>
                  </div>
                </button>
                {pendingReviewer?.id === m.id && (
                  <div className="px-3 pb-2 flex items-center gap-3">
                    <button
                      onClick={() => setPendingIsRequired((v) => !v)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                        pendingIsRequired
                          ? "border-red-600 text-red-400 bg-red-900/20"
                          : "border-slate-600 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {pendingIsRequired ? "Pflicht" : "Optional"}
                    </button>
                    <Button
                      size="sm"
                      loading={addReviewerMutation.isPending}
                      onClick={() => addReviewerMutation.mutate({ reviewerId: m.id, isRequired: pendingIsRequired })}
                    >
                      Hinzufügen
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {availableMembers.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-3">Keine Mitglieder gefunden</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Vote-Badge Komponente
function VoteBadge({ vote }: { vote: number }) {
  if (vote === 10) return <Badge variant="success">Approved</Badge>;
  if (vote === 5) return <Badge variant="warning">Mit Vorbehalten</Badge>;
  if (vote === -5) return <Badge variant="warning">Warten</Badge>;
  if (vote === -10) return <Badge variant="danger">Abgelehnt</Badge>;
  return <Badge variant="muted">Ausstehend</Badge>;
}

// Aenderungstyp Indikator
function ChangeTypeDot({ type }: { type: string }) {
  const map: Record<string, { color: string; label: string }> = {
    add: { color: "text-green-400", label: "A" },
    edit: { color: "text-blue-400", label: "M" },
    delete: { color: "text-red-400", label: "D" },
    rename: { color: "text-yellow-400", label: "R" },
  };
  const info = map[type?.toLowerCase()] || { color: "text-slate-400", label: "?" };
  return <span className={`text-xs font-bold font-mono ${info.color} flex-shrink-0`}>{info.label}</span>;
}

// Kommentar-Thread Anzeige
function CommentThread({
  thread,
  currentUserId,
  onUpdateStatus,
  onEditComment,
  onDeleteComment,
  onReply,
}: {
  thread: PRThread;
  currentUserId?: string;
  onUpdateStatus: (status: PRThread["status"]) => void;
  onEditComment: (commentId: number, content: string) => void;
  onDeleteComment: (commentId: number) => void;
  onReply: (content: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const textComments = thread.comments.filter((c) => c.commentType === "text");
  if (textComments.length === 0) return null;

  const isResolved = thread.status !== "active" && thread.status !== "pending";

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Thread-Header: Status + Resolve/Reopen-Button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/50">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isResolved ? "text-green-400" : "text-yellow-400"}`}>
          {isResolved ? "Gelöst" : "Offen"}
        </span>
        <button
          onClick={() => onUpdateStatus(isResolved ? "active" : "fixed")}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200 transition-colors"
        >
          {isResolved ? (
            <><RotateCcw size={11} /> Öffnen</>
          ) : (
            <><CheckCheck size={11} /> Lösen</>
          )}
        </button>
      </div>
      {textComments.map((comment, i) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isFirst={i === 0}
          currentUserId={currentUserId}
          onEdit={(content) => onEditComment(comment.id, content)}
          onDelete={() => onDeleteComment(comment.id)}
        />
      ))}
      {/* Antworten-Footer */}
      {showReply ? (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-slate-800">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Antworten..."
            autoFocus
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
            >
              <Send size={12} /> Senden
            </button>
            <button
              onClick={() => { setShowReply(false); setReplyText(""); }}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowReply(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-slate-800 transition-colors"
        >
          <MessageCircle size={12} /> Antworten
        </button>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  isFirst,
  currentUserId,
  onEdit,
  onDelete,
}: {
  comment: PRComment;
  isFirst: boolean;
  currentUserId?: string;
  onEdit: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [deleting, setDeleting] = useState(false);
  const isOwn = !!currentUserId && comment.author.id === currentUserId;

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === comment.content) { setEditing(false); return; }
    onEdit(editText.trim());
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    onDelete();
  };

  return (
    <div className={`p-3 ${isFirst ? "" : "border-t border-slate-800"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-slate-300">
            {comment.author.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-300">{comment.author.displayName}</span>
        <span className="text-xs text-slate-600 ml-auto">
          {formatDistanceToNow(new Date(comment.publishedDate), { addSuffix: true, locale: de })}
        </span>
        {isOwn && !editing && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => { setEditText(comment.content); setEditing(true); }}
              className="p-1 text-slate-600 hover:text-blue-400 transition-colors"
              title="Bearbeiten"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Löschen"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="pl-8 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              <Check size={12} /> Speichern
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-200 whitespace-pre-wrap pl-8">{comment.content}</p>
      )}
    </div>
  );
}
