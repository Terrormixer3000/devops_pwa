"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";

interface Props {
  current: "pipelines" | "releases";
}

const OPTIONS = [
  { key: "pipelines", label: "Pipelines", href: "/pipelines" },
  { key: "releases", label: "Releases", href: "/releases" },
] as const;

export function DeliveryTitleSelector({ current }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const currentOption = OPTIONS.find((option) => option.key === current) ?? OPTIONS[0];

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex max-w-[10rem] items-center gap-1.5 rounded-2xl px-1 py-1 text-left text-slate-100 transition-colors hover:text-blue-300"
      >
        {/* Der Delivery-Titel dient gleichzeitig als Bereichsumschalter zwischen Pipelines und Releases. */}
        <span className="truncate text-[18px] font-semibold tracking-[-0.01em]">{currentOption.label}</span>
        <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Delivery Bereich">
        <div className="p-3">
          <div className="space-y-2">
            {OPTIONS.map((option) => {
              const isActive = option.key === current;
              return (
                <button
                  key={option.key}
                  onClick={() => handleSelect(option.href)}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-blue-950/30 ring-1 ring-blue-500/20" : "bg-slate-800/40 hover:bg-slate-800/70"
                  }`}
                >
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${isActive ? "border-blue-500 bg-blue-500" : "border-slate-600"}`}>
                    {isActive && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{option.label}</p>
                    <p className="text-xs text-slate-500">
                      {option.key === "pipelines" ? "Builds und Definitionen" : "Releases und Approvals"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </>
  );
}
