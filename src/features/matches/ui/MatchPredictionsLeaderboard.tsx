"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Match } from "@/entities/match/model/types";
import { projectPredictionPoints } from "@/entities/prediction/lib/scoring";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { createOutcomeMessages } from "@/shared/lib/i18n/outcome-messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchPredictionsLeaderboardProps {
  match: Match;
  predictions: MatchPredictionEntry[];
  currentUserId?: string | null;
  canSeePlayerNames?: boolean;
}

function resolveEntryPoints(
  entry: MatchPredictionEntry,
  match: Match,
): number | null {
  if (
    match.status === "finished" &&
    entry.points_awarded !== null &&
    match.home_score !== null &&
    match.away_score !== null
  ) {
    return entry.points_awarded;
  }

  if (match.home_score !== null && match.away_score !== null) {
    return projectPredictionPoints(
      entry.outcome,
      match.home_score,
      match.away_score,
    );
  }

  return null;
}

function formatPoints(points: number | null): string {
  if (points === null) return "—";
  if (points > 0) return `+${points}`;
  return String(points);
}

export function MatchPredictionsLeaderboard({
  match,
  predictions,
  currentUserId,
  canSeePlayerNames = true,
}: MatchPredictionsLeaderboardProps) {
  const t = useTranslations("matches");
  const tCommon = useTranslations("common");
  const tOutcome = useTranslations("match.outcome");
  const outcomeMessages = useMemo(
    () => createOutcomeMessages(tOutcome),
    [tOutcome],
  );

  const ranked = [...predictions]
    .map((entry) => ({
      entry,
      points: resolveEntryPoints(entry, match),
    }))
    .sort((a, b) => (b.points ?? -1) - (a.points ?? -1));

  if (ranked.length === 0) {
    return (
      <p className="text-center text-sm text-white/50">
        {t("noPredictionsYet")}
      </p>
    );
  }

  const pointsLabel =
    match.status === "live" ? t("ptsLive") : t("points");

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-x-3 px-0.5 pb-1 text-[11px] font-medium text-white/45">
        <span>{t("player")}</span>
        <span>{t("pick")}</span>
        <span className="text-right">{pointsLabel}</span>
      </div>

      <ul className="flex flex-col">
        {ranked.map(({ entry, points }, index) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const rank = index + 1;

          return (
            <li
              key={entry.user_id}
              className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-x-3 border-t border-white/8 py-2.5 first:border-t-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                {canSeePlayerNames ? (
                  <Avatar className="size-7 shrink-0">
                    {entry.photo_url && (
                      <AvatarImage
                        src={entry.photo_url}
                        alt={entry.display_name}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(entry.display_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm text-white">
                      {canSeePlayerNames
                        ? entry.display_name
                        : t("playerRank", { rank })}
                    </p>
                    {canSeePlayerNames && isCurrentUser && (
                      <Badge
                        variant="secondary"
                        className="h-4 shrink-0 rounded-md px-1.5 text-[10px]"
                      >
                        {tCommon("you")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="max-w-[5.5rem] truncate text-right text-xs text-white/55">
                {formatOutcomeWins(
                  entry.outcome,
                  match.home_team_name,
                  match.away_team_name,
                  outcomeMessages,
                )}
              </p>

              <p
                className={cn(
                  "text-right text-sm font-semibold tabular-nums",
                  points && points > 0 ? "text-emerald-300" : "text-white/45",
                )}
              >
                {formatPoints(points)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
