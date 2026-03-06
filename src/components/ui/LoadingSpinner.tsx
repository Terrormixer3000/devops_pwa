"use client";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };

export function LoadingSpinner({ size = "md", className = "" }: Props) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-600 border-t-blue-500 ${sizeMap[size]} ${className}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}
