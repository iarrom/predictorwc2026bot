"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { tryAutoReloadOnDeploySkew } from "@/shared/lib/deploy-skew-error";

interface AppErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  reloadLabel: string;
}

export function AppErrorFallback({
  error,
  reset,
  title,
  description,
  reloadLabel,
}: AppErrorFallbackProps) {
  useEffect(() => {
    if (tryAutoReloadOnDeploySkew(error)) {
      return;
    }

    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <div className="glass corner-squircle w-full rounded-3xl border-0 px-6 py-8">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button
          type="button"
          className="mt-6 w-full"
          onClick={() => {
            reset();
            window.location.reload();
          }}
        >
          {reloadLabel}
        </Button>
      </div>
    </div>
  );
}
