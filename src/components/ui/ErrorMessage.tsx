"use client";

import { AlertCircle } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-slate-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
