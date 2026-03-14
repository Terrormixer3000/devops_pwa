"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import { timeAgo } from "@/lib/utils/timeAgo";
import type { PRComment } from "@/types";

/** Einzelner Kommentar mit Bearbeiten- und Löschen-Optionen. */
export function CommentItem({
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
  const t = useTranslations("commentItem");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [deleting, setDeleting] = useState(false);
  const isOwn = !!currentUserId && comment.author.id === currentUserId;

  const handleSaveEdit = () => {
    if (!editText.trim() || editText === comment.content) { setEditing(false); return; }
    onEdit(editText.trim());
    setEditing(false);
  };

  const handleDelete = () => {
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
        <span className="text-xs text-slate-600 ml-auto">{timeAgo(comment.publishedDate)}</span>
        {isOwn && !editing && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => { setEditText(comment.content); setEditing(true); }}
              className="p-1 text-slate-600 hover:text-blue-400 transition-colors"
              title={t("editTitle")}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
              title={t("deleteTitle")}
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
              <Check size={12} /> {t("save")}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-200 whitespace-pre-wrap pl-8">{comment.content}</p>
      )}
    </div>
  );
}
