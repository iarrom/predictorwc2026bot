"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { pingAllPending } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

interface PingAllButtonProps {
  matchId: string;
  pendingCount: number;
}

export function PingAllButton({ matchId, pendingCount }: PingAllButtonProps) {
  const t = useTranslations("admin.ping");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePingAll() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      const response = await pingAllPending(matchId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setResult({
        sent: response.sent ?? 0,
        failed: response.failed ?? 0,
      });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={pending || pendingCount === 0}
        onClick={handlePingAll}
      >
        {pending
          ? t("sendingAll")
          : t("pingAll", { count: pendingCount })}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">
          {t("pingAllResult", {
            sent: result.sent,
            failed: result.failed,
          })}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
