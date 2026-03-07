"use client";

import { useState, use } from "react";
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
import { PRThread, PRComment } from "@/types";
import { RichDiffViewer } from "@/components/ui/RichDiffViewer";
import { isImagePath } from "@/lib/utils/fileTypes";
import { BackLink } from "@/components/ui/BackButton";
import {
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
  const [selectedChangeKey, setSelectedChangeKey] = useState<string | null>(null);

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

  // Abstimmen (Approve / Reject)
  const voteMutation = useMutation({
    mutationFn: (vote: number) => {
      if (!client || !settings) throw new Error("Kein Client");
      // Reviewer-ID wird aus den Reviewern des PRs ermittelt
      const reviewerId = pr?.reviewers[0]?.id || "me";
      return pullRequestsService.vote(client, settings.project, repoId, prIdNum, reviewerId, vote);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] });
      setApproveModal(false);
    },
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
        false
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pr", repoId, prIdNum] });
      setCompleteModal(false);
    },
  });

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

  if (isLoading) return <div className="min-h-screen"><AppBar title="Pull Request" /><PageLoader /></div>;
  if (error || !pr) return <div className="min-h-screen"><AppBar title="Pull Request" /><ErrorMessage message="PR konnte nicht geladen werden" /></div>;

  return (
    <div className="min-h-screen">
      <AppBar title="Pull Request" />

      {/* Zurueck-Link */}
      <div className="px-4 pt-4">
        <BackLink href="/pull-requests" className="mb-3" />
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
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setApproveModal(true)}>
              <ThumbsUp size={14} />
              Approven
            </Button>
            <Button size="sm" variant="ghost" onClick={() => voteMutation.mutate(-10)} loading={voteMutation.isPending}>
              <ThumbsDown size={14} />
              Ablehnen
            </Button>
            <Button size="sm" variant="primary" onClick={() => setCompleteModal(true)}>
              <GitMerge size={14} />
              Complete
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky-below-appbar bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="flex overflow-x-auto hide-scrollbar px-4">
          {[
            { key: "uebersicht", label: "Uebersicht", icon: FileText },
            { key: "dateien", label: `Dateien${changes?.changeEntries ? ` (${changes.changeEntries.length})` : ""}`, icon: FileText },
            { key: "kommentare", label: `Kommentare${commentThreads.length ? ` (${commentThreads.length})` : ""}`, icon: MessageCircle },
            { key: "commits", label: "Commits", icon: GitCommit },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                activeTab === key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div className="px-4 py-4">
        {activeTab === "uebersicht" && (
          <div className="space-y-4">
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
            {pr.reviewers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reviewer</h3>
                <div className="space-y-2">
                  {pr.reviewers.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-300">{r.displayName}</span>
                      <VoteBadge vote={r.vote} />
                    </div>
                  ))}
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
            {/* Kommentar-Eingabe */}
            <div className="flex flex-col gap-2">
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

            {/* Kommentar-Liste */}
            {commentThreads.map((thread) => (
              <CommentThread key={thread.id} thread={thread} />
            ))}
          </div>
        )}

        {activeTab === "commits" && (
          <div className="space-y-2">
            {iterations?.map((iter) => (
              <div key={iter.id} className="p-3 bg-slate-800/60 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <GitCommit size={14} className="text-blue-400" />
                  <span className="font-mono truncate">{iter.sourceRefCommit?.commitId?.substring(0, 8)}</span>
                  <span className="ml-auto">{formatDistanceToNow(new Date(iter.createdDate), { addSuffix: true, locale: de })}</span>
                </div>
                {iter.description && <p className="text-sm text-slate-300 mt-1">{iter.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Pull Request bewerten">
        <div className="space-y-3">
          <Button fullWidth onClick={() => voteMutation.mutate(10)} loading={voteMutation.isPending}>
            <ThumbsUp size={16} /> Approven
          </Button>
          <Button fullWidth variant="secondary" onClick={() => voteMutation.mutate(5)} loading={voteMutation.isPending}>
            Approven mit Vorbehalten
          </Button>
          <Button fullWidth variant="ghost" onClick={() => voteMutation.mutate(-5)} loading={voteMutation.isPending}>
            Warten auf Autor
          </Button>
          <Button fullWidth variant="danger" onClick={() => voteMutation.mutate(-10)} loading={voteMutation.isPending}>
            <ThumbsDown size={16} /> Ablehnen
          </Button>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title="PR abschliessen">
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Moechtest du diesen Pull Request abschliessen und mergen?
          </p>
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
function CommentThread({ thread }: { thread: PRThread }) {
  const textComments = thread.comments.filter((c) => c.commentType === "text");
  if (textComments.length === 0) return null;

  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      {textComments.map((comment, i) => (
        <CommentItem key={comment.id} comment={comment} isFirst={i === 0} />
      ))}
    </div>
  );
}

function CommentItem({ comment, isFirst }: { comment: PRComment; isFirst: boolean }) {
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
      </div>
      <p className="text-sm text-slate-200 whitespace-pre-wrap pl-8">{comment.content}</p>
    </div>
  );
}
