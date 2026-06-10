"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { pingUser } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

interface PingUserButtonProps {
  userId: string;
  matchId: string;
}

export function PingUserButton({ userId, matchId }: PingUserButtonProps) {
  const t = useTranslations("admin.ping");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function handlePing() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const result = await pingUser(userId, matchId);
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setStatus("success");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={pending || status === "success"}
        onClick={handlePing}
      >
        {pending ? t("sending") : status === "success" ? t("sent") : t("ping")}
      </Button>
      {status === "error" && error && (
        <span className="max-w-40 text-right text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
