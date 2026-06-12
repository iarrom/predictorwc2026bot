"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PredictionOutcome } from "@/entities/prediction/model/types";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import { savePrediction } from "@/features/predictions/actions";
import { createOutcomeMessages } from "@/shared/lib/i18n/outcome-messages";
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
  "h-full min-h-14 min-w-0 basis-0 flex-1 flex-col gap-0.5 px-1 py-2 text-sm whitespace-normal text-white/60 hover:text-white data-active:bg-white/20 data-active:text-white dark:text-white/60 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white";

function PredictionSummary({
  outcome,
  homeTeamName,
  awayTeamName,
  onEdit,
  outcomeMessages,
  t,
}: {
  outcome: PredictionOutcome;
  homeTeamName: string;
  awayTeamName: string;
  onEdit: () => void;
  outcomeMessages: ReturnType<typeof createOutcomeMessages>;
  t: ReturnType<typeof useTranslations<"predictions">>;
}) {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col justify-between gap-4">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-lg font-bold leading-tight text-white">
          {formatOutcomeWins(outcome, homeTeamName, awayTeamName, outcomeMessages)}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="xl"
        onClick={onEdit}
        className="shrink-0 bg-white text-black hover:bg-white/90 aria-expanded:bg-white aria-expanded:text-black"
      >
        {t("changeMind")}
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
  const router = useRouter();
  const t = useTranslations("predictions");
  const tOutcome = useTranslations("match.outcome");
  const outcomeMessages = useMemo(
    () => createOutcomeMessages(tOutcome),
    [tOutcome],
  );

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
        router.refresh();
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
          ? t("yourPick", {
              pick: formatOutcomeWins(
                initial.outcome,
                homeTeamName,
                awayTeamName,
                outcomeMessages,
              ),
            })
          : t("locked")}
      </p>
    );
  }

  if (!canPredict) {
    return (
      <p className="text-sm text-white/70">{t("guestMessage")}</p>
    );
  }

  if (summaryOutcome && mode === "readonly") {
    return (
      <PredictionSummary
        outcome={summaryOutcome}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        onEdit={() => setMode("edit")}
        outcomeMessages={outcomeMessages}
        t={t}
      />
    );
  }

  return (
    <form
      action={action}
      className="flex w-full min-h-0 flex-1 flex-col justify-between gap-4"
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
            <TabsList className="flex h-auto w-full bg-white/10 p-1 group-data-horizontal/tabs:h-auto">
              <TabsTrigger value="home" className={outcomeTabClassName}>
                <span className="text-lg font-bold">1</span>
                <span className="line-clamp-2 text-[10px] leading-tight">
                  {homeTeamName}
                </span>
              </TabsTrigger>
              <TabsTrigger value="draw" className={outcomeTabClassName}>
                <span className="text-lg font-bold">X</span>
                <span className="text-[10px] leading-tight">{t("draw")}</span>
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
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
