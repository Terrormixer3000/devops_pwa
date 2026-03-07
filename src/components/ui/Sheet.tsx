"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  bottomOffset?: string;
  topOffset?: string;
  sheetHeight?: string;
  maxSheetHeight?: string;
  opaquePanel?: boolean;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  bottomOffset,
  topOffset,
  sheetHeight,
  maxSheetHeight,
  opaquePanel = false,
}: Props) {
  const dragStartYRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const resetDrag = () => {
    dragStartYRef.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.touches[0]?.clientY ?? null;
    dragOffsetRef.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;

    const currentY = event.touches[0]?.clientY ?? dragStartYRef.current;
    const nextOffset = Math.max(0, currentY - dragStartYRef.current);

    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);

    if (nextOffset > 0) {
      event.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    const shouldClose = dragOffsetRef.current > 90;
    resetDrag();

    if (shouldClose) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`relative w-full rounded-t-[2rem] border border-slate-700/70 shadow-[0_-14px_40px_rgba(0,0,0,0.34)] flex flex-col animate-slide-up ${
          opaquePanel ? "bg-slate-900" : "bg-slate-900/92 backdrop-blur-2xl"
        } ${
          bottomOffset ? "absolute left-0 right-0" : "mt-auto"
        }`}
        style={{
          /* Auswahl-Sheets koennen oberhalb der Bottom Navigation verankert werden,
             waehrend andere Sheets weiterhin den kompletten unteren Bildschirmrand nutzen. */
          bottom: bottomOffset ?? 0,
          top: topOffset,
          height: topOffset ? "auto" : (sheetHeight ?? "75vh"),
          maxHeight: maxSheetHeight ?? "calc(100vh - var(--safe-area-top-effective) - 1.5rem)",
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="touch-pan-x select-none"
        >
          {/* Zentrierte Handle-Pill */}
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="h-1.5 w-10 rounded-full bg-slate-500/80" />
          </div>
          {/* Kompakter Header */}
          {title && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 flex-shrink-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition-colors hover:bg-slate-700/80"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        {/* Scrollbarer Inhalt */}
        <div
          className="overflow-y-auto overflow-x-hidden flex-1 overscroll-contain"
          style={{ paddingBottom: "var(--safe-area-bottom-effective)" }}
        >{children}</div>
      </div>
    </div>
  );
}
