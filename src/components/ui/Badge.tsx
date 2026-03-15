"use client";

/** Kleine Kennzeichnungs-Pille in verschiedenen semantischen Farben. */
interface Props {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info" | "muted" | "purple";
  size?: "sm" | "md";
}

// Farbvarianten fuer semantische Zustands-Badges (CSS-Variablen fuer Theme-Adaptivitaet)
const variants = {
  default: "border border-slate-600/70 bg-slate-700/80 text-slate-200",
  success: "border border-green-600/30 bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
  danger: "border border-red-600/30 bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)]",
  warning: "border border-yellow-600/30 bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]",
  info: "border border-blue-600/30 bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]",
  muted: "border border-slate-700/70 bg-slate-800/90 text-slate-400",
  purple: "border border-purple-600/30 bg-[var(--badge-purple-bg)] text-[var(--badge-purple-text)]",
};

// Groessen: sm fuer kompakte Listen, md als Standard
const sizes = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

/** Stellt das Badge-Element dar. */
export function Badge({ children, variant = "default", size = "md" }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium tracking-[-0.01em] ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}
