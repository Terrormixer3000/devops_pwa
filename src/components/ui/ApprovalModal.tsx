"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

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
        <Button
          fullWidth
          loading={isPending}
          onClick={() => approval && onApprove(approval.id, comment)}
        >
          <ThumbsUp size={16} /> {t("approve")}
        </Button>
        <Button
          fullWidth
          variant="danger"
          loading={isPending}
          onClick={() => approval && onReject(approval.id, comment)}
        >
          <ThumbsDown size={16} /> {t("reject")}
        </Button>
        <Button fullWidth variant="ghost" onClick={handleClose}>{t("cancel")}</Button>
      </div>
    </Modal>
  );
}
