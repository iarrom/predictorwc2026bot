"use client";

import { useEffect } from "react";
import { tryAutoReloadOnDeploySkew } from "@/shared/lib/deploy-skew-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (tryAutoReloadOnDeploySkew(error)) {
      return;
    }

    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-[#0a1628] px-4 text-white">
        <div className="w-full max-w-sm rounded-3xl bg-white/10 px-6 py-8 text-center backdrop-blur-xl">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-white/70">
            Please reload the app and try again.
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-white/20 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/30"
            onClick={() => {
              reset();
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
