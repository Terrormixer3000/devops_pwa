"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { SelectionSheet, type SelectionItem } from "@/components/ui/SelectionSheet";

/** Props fuer den Delivery-Titelschalter. */
interface Props {
  current: "pipelines" | "releases";
}

/**
 * Dropdown-Schalter im AppBar-Titel der zwischen Pipelines und Releases wechselt.
 * Nutzt das SelectionSheet als Auswahl-Overlay.
 */
export function DeliveryTitleSelector({ current }: Props) {
  const router = useRouter();
  const t = useTranslations("delivery");
  const OPTIONS = [
    { key: "pipelines", label: "Pipelines", href: "/pipelines", sublabel: t("builds") },
    { key: "releases", label: "Releases", href: "/releases", sublabel: t("releases") },
  ] as const;
  const currentOption = OPTIONS.find((option) => option.key === current) ?? OPTIONS[0];
  const items: SelectionItem[] = OPTIONS.map((option) => ({
    id: option.key,
    label: option.label,
    sublabel: option.sublabel,
  }));

  const handleToggle = (id: string) => {
    const option = OPTIONS.find((entry) => entry.key === id);
    if (option) {
      router.push(option.href);
    }
  };

  return (
    <SelectionSheet
      buttonLabel={currentOption.label}
      trigger={(
        <button
          className="flex max-w-[10rem] items-center gap-1.5 rounded-2xl px-1 py-1 text-left text-slate-100 transition-colors hover:text-blue-300"
        >
          <span className="truncate text-[18px] font-semibold tracking-[-0.01em]">{currentOption.label}</span>
          <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
        </button>
      )}
      sheetTitle={t("title")}
      items={items}
      selectedIds={[currentOption.key]}
      onToggle={handleToggle}
      multiSelect={false}
    />
  );
}
