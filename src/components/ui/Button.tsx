"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

/** Einheitlicher Button mit Varianten, Groessen und Lade-Zustand. */
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

// Visual-Stile pro Variante (Tailwind-Klassen, mit Light-Mode-Overrides)
const variants = {
  primary: "border border-blue-400/30 bg-blue-600 text-white shadow-[0_10px_24px_rgba(0,120,212,0.28)] hover:bg-blue-500 disabled:bg-blue-800",
  secondary: "border border-slate-600/70 bg-slate-700/80 text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:bg-slate-600/90 disabled:bg-slate-800 [html[data-theme='light']_&]:bg-slate-200 [html[data-theme='light']_&]:text-slate-700 [html[data-theme='light']_&]:border-slate-300 [html[data-theme='light']_&]:hover:bg-slate-300",
  danger: "border border-red-500/30 bg-red-700 text-white shadow-[0_10px_24px_rgba(164,38,44,0.24)] hover:bg-red-600 disabled:bg-red-800",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-800/70 [html[data-theme='light']_&]:text-slate-600 [html[data-theme='light']_&]:hover:bg-slate-200/70",
  outline: "border border-slate-600/80 bg-slate-900/30 text-slate-200 hover:bg-slate-800/70 [html[data-theme='light']_&]:border-slate-300 [html[data-theme='light']_&]:bg-slate-100/50 [html[data-theme='light']_&]:text-slate-700 [html[data-theme='light']_&]:hover:bg-slate-200/70",
};

// Min-Hoehe und Schriftgroesse pro Groesse
const sizes = {
  sm: "min-h-[38px] px-3.5 py-2 text-sm",
  md: "min-h-[46px] px-4 py-2.5 text-sm",
  lg: "min-h-[54px] px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, fullWidth, children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 rounded-2xl font-medium tracking-[-0.01em]
          transition-all active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}
        `}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
