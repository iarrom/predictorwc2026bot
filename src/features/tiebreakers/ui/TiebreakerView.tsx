"use client";

import { useState } from "react";
import type { TiebreakerRoundState } from "@/entities/tiebreaker/model/types";
import { formatTiebreakerDeadline } from "@/features/tiebreakers/lib/formatDeadline";
import { formatTiebreakerMatchCount } from "@/features/tiebreakers/lib/formatMatchCount";
import { TiebreakerDrawer } from "@/features/tiebreakers/ui/TiebreakerDrawer";
import { cn } from "@/lib/utils";

interface TiebreakerViewProps {
  rounds: TiebreakerRoundState[];
  canEdit: boolean;
}

function RoundStatus({
  round,
}: {
  round: TiebreakerRoundState;
}) {
  if (round.locked) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground">
        Locked
      </span>
    );
  }

  if (!round.deadlineAt) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground">
        Unavailable
      </span>
    );
  }

  return (
    <span className="text-[11px] text-muted-foreground">
      Until {formatTiebreakerDeadline(round.deadlineAt)}
    </span>
  );
}

export function TiebreakerView({ rounds, canEdit }: TiebreakerViewProps) {
  const [activeRoundKey, setActiveRoundKey] = useState<string | null>(null);

  const activeRound =
    rounds.find((round) => round.roundKey === activeRoundKey) ?? null;

  return (
    <>
      <div className="flex flex-col animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
        <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
          <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
            <h1 className="text-[15px] font-semibold text-foreground">
              Tie-break
            </h1>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Predict total goals scored in each round. Used as a tie-breaker
              when points are equal.
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
                      {round.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatTiebreakerMatchCount(round.matchCount)}
                    </p>
                    <RoundStatus round={round} />
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
      />
    </>
  );
}
