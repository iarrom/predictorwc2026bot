"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/shared/types/database";
import { updateUserRole } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

interface MemberRoleControlsProps {
  userId: string;
  currentRole: UserRole;
  isSelf: boolean;
}

export function MemberRoleControls({
  userId,
  currentRole,
  isSelf,
}: MemberRoleControlsProps) {
  const t = useTranslations("admin.roles");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roleLabels: Record<UserRole, string> = {
    guest: t("guest"),
    participant: t("participant"),
    admin: t("admin"),
  };

  const targets = (["guest", "participant", "admin"] as UserRole[]).filter(
    (role) => {
      if (role === currentRole) return false;
      if (isSelf) return false;
      return true;
    },
  );

  if (!targets.length) {
    return (
      <span className="text-xs text-muted-foreground">
        {isSelf ? tCommon("you") : roleLabels[currentRole]}
      </span>
    );
  }

  function setRole(role: UserRole) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("user_id", userId);
      formData.set("role", role);
      const result = await updateUserRole(null, formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {targets.map((role) => (
          <Button
            key={role}
            type="button"
            size="xs"
            variant={role === "admin" ? "default" : "outline"}
            disabled={pending}
            onClick={() => setRole(role)}
          >
            {roleLabels[role]}
          </Button>
        ))}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
