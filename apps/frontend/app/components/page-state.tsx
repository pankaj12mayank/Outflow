"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function PageError({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-gray-300 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
