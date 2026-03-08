"use client";

import Link, { LinkProps } from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

/** Kompakter oder Standard-Zurueck-Button mit Chevron-Icon. */
type BackButtonSize = "compact" | "default";

const sizeStyles: Record<BackButtonSize, { button: string; icon: number }> = {
  compact: {
    button: "min-h-[38px] min-w-[38px] px-2.5 text-xs",
    icon: 17,
  },
  default: {
    button: "min-h-[44px] min-w-[44px] px-3.5 text-sm",
    icon: 18,
  },
};

/** Baut die gemeinsamen CSS-Klassen fuer beide Button-Varianten zusammen. */
function baseClasses(size: BackButtonSize, iconOnly: boolean) {
  return [
    "inline-flex items-center gap-1.5 rounded-full border border-slate-700/80",
    "bg-slate-800/80 text-slate-200 hover:bg-slate-700/85",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:ring-offset-1 focus:ring-offset-slate-900",
    "active:scale-[0.985] transition-all",
    sizeStyles[size].button,
    iconOnly ? "justify-center" : "",
  ].join(" ");
}

/** Props fuer den Link-basierten Zurueck-Button (navigiert per href). */
interface BackLinkProps extends Omit<LinkProps, "href"> {
  href: string;
  label?: ReactNode;
  className?: string;
  size?: BackButtonSize;
}

/** Navigationslink der als Zurueck-Button dargestellt wird. */
export function BackLink({
  href,
  label = "Zurueck",
  className = "",
  size = "default",
  ...props
}: BackLinkProps) {
  return (
    <Link
      href={href}
      className={`${baseClasses(size, false)} ${className}`}
      {...props}
    >
      <ChevronLeft size={sizeStyles[size].icon} />
      <span>{label}</span>
    </Link>
  );
}

/** Props fuer den Click-Handler-basierten Zurueck-Button. */
interface BackActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: ReactNode;
  className?: string;
  iconOnly?: boolean;
  size?: BackButtonSize;
}

/** Klick-Button der als Zurueck-Button dargestellt wird (kein href, kein Router-Push). */
export function BackActionButton({
  label = "Zurueck",
  className = "",
  iconOnly = false,
  size = "default",
  ...props
}: BackActionButtonProps) {
  return (
    <button
      type="button"
      className={`${baseClasses(size, iconOnly)} ${className}`}
      aria-label={iconOnly ? "Zurueck" : undefined}
      {...props}
    >
      <ChevronLeft size={sizeStyles[size].icon} />
      {!iconOnly ? <span>{label}</span> : null}
    </button>
  );
}
