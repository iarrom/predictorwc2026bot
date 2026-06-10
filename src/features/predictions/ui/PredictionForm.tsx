"use client";

import { useActionState, useState } from "react";
import type { PredictionOutcome } from "@/entities/prediction/model/types";
import {
  formatOutcomeLabel,
  formatOutcomeShort,
} from "@/entities/prediction/lib/formatOutcome";
import { savePrediction } from "@/features/predictions/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PredictionFormProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  initial?: { outcome: PredictionOutcome };
  locked: boolean;
  canPredict: boolean;
}

const outcomeTabClassName =
  "h-full min-h-14 flex-1 flex-col gap-0.5 px-2 py-2 text-sm text-white/60 hover:text-white data-active:bg-white/20 data-active:text-white dark:text-white/60 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white";

function PredictionSummary({
  outcome,
  homeTeamName,
  awayTeamName,
  onEdit,
}: {
  outcome: PredictionOutcome;
  homeTeamName: string;
  awayTeamName: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-3xl font-bold tabular-nums text-white">
          {formatOutcomeShort(outcome)}
        </p>
        <p className="text-sm text-white/70">
          {formatOutcomeLabel(outcome, homeTeamName, awayTeamName)}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="xl"
        onClick={onEdit}
        className="shrink-0 bg-white text-black hover:bg-white/90 aria-expanded:bg-white aria-expanded:text-black"
      >
        I change my mind
      </Button>
    </div>
  );
}

export function PredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  initial,
  locked,
  canPredict,
}: PredictionFormProps) {
  const [mode, setMode] = useState<"readonly" | "edit">(
    initial ? "readonly" : "edit",
  );
  const [state, action, pending] = useActionState(
    async (
      prev: { error?: string; success?: boolean } | null,
      formData: FormData,
    ) => {
      const result = await savePrediction(prev, formData);
      if (result.success) {
        setMode("readonly");
      }
      return result;
    },
    null,
  );
  const [outcome, setOutcome] = useState<PredictionOutcome>(
    initial?.outcome ?? "home",
  );

  const summaryOutcome =
    state?.success && outcome ? outcome : initial?.outcome;

  if (locked) {
    return (
      <p className="text-sm text-white/70">
        {initial
          ? `Your pick: ${formatOutcomeLabel(initial.outcome, homeTeamName, awayTeamName)}`
          : "Predictions are locked."}
      </p>
    );
  }

  if (!canPredict) {
    return (
      <p className="text-sm text-white/70">
        Voting is available after an admin approves your account.
      </p>
    );
  }

  if (summaryOutcome && mode === "readonly") {
    return (
      <PredictionSummary
        outcome={summaryOutcome}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        onEdit={() => setMode("edit")}
      />
    );
  }

  return (
    <form
      action={action}
      className="flex min-h-0 flex-1 flex-col justify-between gap-4"
    >
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="outcome" value={outcome} />

      <FieldGroup className="min-h-0 flex-1">
        <Field>
          <Tabs
            value={outcome}
            onValueChange={(value) => {
              if (value) setOutcome(value as PredictionOutcome);
            }}
          >
            <TabsList className="h-auto w-full bg-white/10 p-1 group-data-horizontal/tabs:h-auto">
              <TabsTrigger value="home" className={outcomeTabClassName}>
                <span className="text-lg font-bold">1</span>
                <span className="line-clamp-2 text-[10px] leading-tight">
                  {homeTeamName}
                </span>
              </TabsTrigger>
              <TabsTrigger value="draw" className={outcomeTabClassName}>
                <span className="text-lg font-bold">X</span>
                <span className="text-[10px] leading-tight">Draw</span>
              </TabsTrigger>
              <TabsTrigger value="away" className={outcomeTabClassName}>
                <span className="text-lg font-bold">2</span>
                <span className="line-clamp-2 text-[10px] leading-tight">
                  {awayTeamName}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>

        {state?.error && <FieldError>{state.error}</FieldError>}
      </FieldGroup>

      <Button
        type="submit"
        disabled={pending}
        size="xl"
        className="w-full shrink-0 bg-white text-black hover:bg-white/90"
      >
        {pending ? "Saving…" : "Save prediction"}
      </Button>
    </form>
  );
}
