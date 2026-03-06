"use client";

interface Props {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info" | "muted";
  size?: "sm" | "md";
}

const variants = {
  default: "bg-slate-700 text-slate-200",
  success: "bg-green-900/60 text-green-300",
  danger: "bg-red-900/60 text-red-300",
  warning: "bg-yellow-900/60 text-yellow-300",
  info: "bg-blue-900/60 text-blue-300",
  muted: "bg-slate-800 text-slate-400",
};

const sizes = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

export function Badge({ children, variant = "default", size = "md" }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}
