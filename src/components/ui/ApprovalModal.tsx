"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Loader } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ApprovalInfo {
  id: number;
  releaseName?: string;
  environmentName?: string;
}

interface ApprovalModalProps {
  open: boolean;
  approval: ApprovalInfo | null;
  isPending: boolean;
  error?: string | null;
  onApprove: (id: number, comment: string) => void;
  onReject: (id: number, comment: string) => void;
  onClose: () => void;
}

/** Wiederverwendbarer Approval-Dialog fuer Release-Freigaben. */
export function ApprovalModal({ open, approval, isPending, error, onApprove, onReject, onClose }: ApprovalModalProps) {
  const [comment, setComment] = useState("");
  const t = useTranslations("approval");

  const handleClose = () => {
    setComment("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={t("title")}>
      <div className="space-y-4">
        {approval && (
          <p className="text-sm text-slate-300">
            {approval.releaseName} → {approval.environmentName}
          </p>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-400">{t("commentLabel")}</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-800/50 bg-green-900/20 py-2.5 text-sm font-medium text-green-400 hover:bg-green-900/35 transition-colors disabled:opacity-40"
          disabled={isPending}
          onClick={() => approval && onApprove(approval.id, comment)}
        >
          {isPending ? <Loader size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
          {t("approve")}
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-800/50 bg-red-900/20 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/35 transition-colors disabled:opacity-40"
          disabled={isPending}
          onClick={() => approval && onReject(approval.id, comment)}
        >
          {isPending ? <Loader size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
          {t("reject")}
        </button>
        <button
          className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          onClick={handleClose}
        >
          {t("cancel")}
        </button>
      </div>
    </Modal>
  );
}
