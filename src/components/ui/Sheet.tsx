"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="relative mt-auto w-full bg-slate-900 rounded-t-2xl flex flex-col animate-slide-up"
        style={{
          height: "75vh",
          maxHeight: "calc(100vh - env(safe-area-inset-top) - 1.5rem)",
        }}
      >
        {/* Zentrierte Handle-Pill */}
        <div className="flex justify-center pt-2 pb-0.5 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-slate-600" />
        </div>
        {/* Kompakter Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Scrollbarer Inhalt */}
        <div
          className="overflow-y-auto overflow-x-hidden flex-1 overscroll-contain"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >{children}</div>
      </div>
    </div>
  );
}
