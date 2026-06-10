"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/shared/types/database";
import { updateUserRole } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<UserRole, string> = {
  guest: "Guest",
  participant: "Participant",
  admin: "Admin",
};

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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        {isSelf ? "You" : ROLE_LABELS[currentRole]}
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
            {ROLE_LABELS[role]}
          </Button>
        ))}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
