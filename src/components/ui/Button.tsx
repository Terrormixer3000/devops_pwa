"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white disabled:bg-slate-800",
  danger: "bg-red-700 hover:bg-red-600 text-white disabled:bg-red-800",
  ghost: "bg-transparent hover:bg-slate-800 text-slate-300",
  outline: "border border-slate-600 hover:bg-slate-800 text-slate-200",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm min-h-[36px]",
  md: "px-4 py-2 text-sm min-h-[44px]",
  lg: "px-6 py-3 text-base min-h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, fullWidth, children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 rounded-xl font-medium
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900
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
