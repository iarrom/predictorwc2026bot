"use client";

import type { Match } from "@/entities/match/model/types";
import {
  formatOutcomeLabel,
  formatOutcomeShort,
} from "@/entities/prediction/lib/formatOutcome";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MatchPredictionsBoardProps {
  match: Match;
  predictions: MatchPredictionEntry[];
  currentUserId?: string | null;
}

export function MatchPredictionsBoard({
  match,
  predictions,
  currentUserId,
}: MatchPredictionsBoardProps) {
  const ranked = [...predictions].sort((a, b) => {
    const aPoints = a.points_awarded ?? -1;
    const bPoints = b.points_awarded ?? -1;
    return bPoints - aPoints;
  });

  if (ranked.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No predictions yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {ranked.map((entry) => {
        const isCurrentUser = entry.user_id === currentUserId;

        return (
          <li
            key={entry.user_id}
            className="flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2.5"
          >
            <Avatar className="size-8 shrink-0">
              {entry.photo_url && (
                <AvatarImage src={entry.photo_url} alt={entry.display_name} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(entry.display_name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {entry.display_name}
                </p>
                {isCurrentUser && (
                  <Badge
                    variant="secondary"
                    className="h-4 shrink-0 rounded-md px-1.5 text-[10px]"
                  >
                    You
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatOutcomeShort(entry.outcome)} ·{" "}
                {formatOutcomeLabel(
                  entry.outcome,
                  match.home_team_name,
                  match.away_team_name,
                )}
              </p>
            </div>

            <p className="shrink-0 text-base font-bold tabular-nums">
              {entry.points_awarded !== null ? entry.points_awarded : "—"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
