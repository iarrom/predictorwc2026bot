"use client";

import { useActionState, useState } from "react";
import type { TiebreakerRoundState } from "@/entities/tiebreaker/model/types";
import { saveTiebreaker } from "@/features/tiebreakers/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { WheelPicker } from "@/components/ui/wheel-picker";

interface TiebreakerFormProps {
  round: TiebreakerRoundState;
  canEdit: boolean;
  onSaved?: () => void;
}

export function TiebreakerForm({ round, canEdit, onSaved }: TiebreakerFormProps) {
  const [goals, setGoals] = useState(round.goals ?? 0);
  const [state, action, pending] = useActionState(
    async (
      prev: { error?: string; success?: boolean } | null,
      formData: FormData,
    ) => {
      const result = await saveTiebreaker(prev, formData);
      if (result.success) {
        onSaved?.();
      }
      return result;
    },
    null,
  );

  if (round.locked) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-center text-4xl font-bold tabular-nums text-foreground">
          {round.goals ?? "—"}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          This round is locked.
        </p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        You can browse matches and the leaderboard. Tie-breaker picks open
        after an admin approves your account.
      </p>
    );
  }

  return (
    <form action={action} className="flex min-h-0 flex-1 flex-col gap-4">
      <input type="hidden" name="round_key" value={round.roundKey} />
      <input type="hidden" name="goals" value={goals} />

      <FieldGroup className="min-h-0 flex-1">
        <Field>
          <div className="mx-auto w-full max-w-[8rem]">
            <WheelPicker
              value={goals}
              onChange={setGoals}
              min={0}
              max={round.maxGoals}
              itemHeight={40}
              visibleItems={5}
              aria-label={`Total goals for ${round.label}`}
            />
          </div>
        </Field>
        {state?.error && <FieldError>{state.error}</FieldError>}
      </FieldGroup>

      <Button type="submit" size="xl" disabled={pending} className="shrink-0">
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
