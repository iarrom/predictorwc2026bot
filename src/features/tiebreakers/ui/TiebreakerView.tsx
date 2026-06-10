"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useLiveRefresh } from "@/shared/lib/supabase/useLiveRefresh";
import type { TiebreakerRoundState } from "@/entities/tiebreaker/model/types";
import { formatTiebreakerDeadline } from "@/features/tiebreakers/lib/formatDeadline";
import { formatTiebreakerMatchCount } from "@/features/tiebreakers/lib/formatMatchCount";
import { TiebreakerDrawer } from "@/features/tiebreakers/ui/TiebreakerDrawer";
import type { Locale } from "@/shared/types/database";
import { cn } from "@/lib/utils";

interface TiebreakerViewProps {
  rounds: TiebreakerRoundState[];
  canEdit: boolean;
}

function RoundStatus({
  round,
  locale,
  t,
}: {
  round: TiebreakerRoundState;
  locale: Locale;
  t: ReturnType<typeof useTranslations<"tiebreaker">>;
}) {
  if (round.locked) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground">
        {t("locked")}
      </span>
    );
  }

  if (!round.deadlineAt) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground">
        {t("unavailable")}
      </span>
    );
  }

  return (
    <span className="text-[11px] text-muted-foreground">
      {t("until", {
        deadline: formatTiebreakerDeadline(round.deadlineAt, locale),
      })}
    </span>
  );
}

export function TiebreakerView({ rounds, canEdit }: TiebreakerViewProps) {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("tiebreaker");
  const [activeRoundKey, setActiveRoundKey] = useState<string | null>(null);

  useLiveRefresh("tiebreaker-live", "tiebreakers");

  const matchCountMessages = useMemo(
    () => ({
      none: t("matchCount.none"),
      one: (count: number) => t("matchCount.one", { count }),
      other: (count: number) => t("matchCount.other", { count }),
    }),
    [t],
  );

  const activeRound =
    rounds.find((round) => round.roundKey === activeRoundKey) ?? null;

  return (
    <>
      <div className="flex flex-col animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
        <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
          <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
            <h1 className="text-[15px] font-semibold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <div className="overflow-y-auto overscroll-contain">
            {rounds.map((round) => {
              const interactive =
                canEdit && !round.locked && Boolean(round.deadlineAt);

              return (
                <button
                  key={round.roundKey}
                  type="button"
                  disabled={!interactive}
                  onClick={() => {
                    if (interactive) {
                      setActiveRoundKey(round.roundKey);
                    }
                  }}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-x-3 border-t border-white/[0.08] px-4 py-3 text-left transition-colors",
                    interactive
                      ? "cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05]"
                      : "cursor-default",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-tight text-foreground">
                      {t(`rounds.${round.roundKey}`)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatTiebreakerMatchCount(
                        round.matchCount,
                        matchCountMessages,
                      )}
                    </p>
                    <RoundStatus round={round} locale={locale} t={t} />
                  </div>
                  <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                    {round.goals ?? "—"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <TiebreakerDrawer
        round={activeRound}
        canEdit={canEdit}
        onClose={() => setActiveRoundKey(null)}
        onSaved={() => {
          router.refresh();
          setActiveRoundKey(null);
        }}
      />
    </>
  );
}
