"use client";

import { useEffect } from "react";
import { clearDeploySkewReloadFlag } from "@/shared/lib/deploy-skew-error";

function reportClientError(payload: Record<string, unknown>) {
  void fetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort logging only.
  });
}

export function ClientErrorReporter() {
  useEffect(() => {
    clearDeploySkewReloadFlag();

    const onError = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ) => {
      reportClientError({
        type: "error",
        message: typeof message === "string" ? message : "Script error",
        source,
        lineno,
        colno,
        stack: error?.stack,
        name: error?.name,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;

      reportClientError({
        type: "unhandledrejection",
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
        name: reason instanceof Error ? reason.name : undefined,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
