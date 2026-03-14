"use client";

import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CommentThread } from "./CommentThread";
import type { PRThread } from "@/types";

/** Kommentare-Tab: Zeigt alle Threads mit Antwortfunktion und Eingabefeld für neue Kommentare. */
export function PRTabComments({
  commentThreads,
  commentText,
  setCommentText,
  addCommentPending,
  onAddComment,
  currentUserId,
  onUpdateThreadStatus,
  onEditComment,
  onDeleteComment,
  onReplyToThread,
}: {
  commentThreads: PRThread[];
  commentText: string;
  setCommentText: (t: string) => void;
  addCommentPending: boolean;
  onAddComment: () => void;
  currentUserId?: string;
  onUpdateThreadStatus: (threadId: number, status: PRThread["status"]) => void;
  onEditComment: (threadId: number, commentId: number, content: string) => void;
  onDeleteComment: (threadId: number, commentId: number) => void;
  onReplyToThread: (threadId: number, content: string) => void;
}) {
  const t = useTranslations("prComments");
  return (
    <div className="space-y-4">
      {commentThreads.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">{t("noComments")}</p>
      ) : (
        commentThreads.map((thread) => (
          <CommentThread
            key={thread.id}
            thread={thread}
            currentUserId={currentUserId}
            onUpdateStatus={(status) => onUpdateThreadStatus(thread.id, status)}
            onEditComment={(commentId, content) => onEditComment(thread.id, commentId, content)}
            onDeleteComment={(commentId) => onDeleteComment(thread.id, commentId)}
            onReply={(content) => onReplyToThread(thread.id, content)}
          />
        ))
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("newComment")}</h3>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={t("placeholder")}
          rows={3}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        <Button
          size="sm"
          disabled={!commentText.trim()}
          loading={addCommentPending}
          onClick={onAddComment}
          className="self-end"
        >
          <Send size={14} />
          {t("send")}
        </Button>
      </div>
    </div>
  );
}
