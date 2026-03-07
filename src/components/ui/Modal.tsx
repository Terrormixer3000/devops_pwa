"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(v) => { if (!v) onClose(); }}
      direction="bottom"
      modal={true}
      noBodyStyles={true}
      handleOnly={true}
      repositionInputs={false}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md" />
        <Drawer.Content
          className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-[2rem] border border-slate-700/70 bg-slate-900 shadow-[0_-14px_40px_rgba(0,0,0,0.34)]"
          style={{
            maxHeight: "calc(var(--selection-sheet-max-height) + var(--bottom-nav-height))",
          }}
        >
          {/* Swipe-Handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-slate-500/80" />
          </div>

          {title && (
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5 shrink-0">
              <Drawer.Title className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">
                {title}
              </Drawer.Title>
              <Drawer.Close asChild>
                <button className="rounded-full bg-slate-800/80 p-2 text-slate-400 transition-colors hover:bg-slate-700/80">
                  <X size={16} />
                </button>
              </Drawer.Close>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-5"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + var(--safe-area-bottom-effective))" }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
