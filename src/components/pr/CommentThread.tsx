"use client";

import { useState } from "react";
import { MessageCircle, Send, CheckCheck, RotateCcw } from "lucide-react";
import { CommentItem } from "./CommentItem";
import type { PRThread } from "@/types";

/** Darstellung eines vollständigen Kommentar-Threads mit Antwortfunktion. */
export function CommentThread({
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
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/50">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            isResolved ? "text-green-400" : "text-yellow-400"
          }`}
        >
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
      {showReply ? (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-slate-800">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Antworten…"
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
