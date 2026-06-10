"use client";

import { memo } from "react";
import type { Match } from "@/entities/match/model/types";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { MatchDetailContent } from "@/features/matches/ui/MatchDetailContent";
import { cn } from "@/lib/utils";

interface MatchDrawerSlideProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  matchPredictions: MatchPredictionEntry[];
  currentUserId: string | null;
  teamColors: Record<string, string>;
  canPredict: boolean;
  isActive: boolean;
  isMounted: boolean;
  distanceFromActive: number;
}

export const MatchDrawerSlide = memo(function MatchDrawerSlide({
  match,
  voters,
  prediction,
  matchPredictions,
  currentUserId,
  teamColors,
  canPredict,
  isActive,
  isMounted,
  distanceFromActive,
}: MatchDrawerSlideProps) {
  const isNeighbor = distanceFromActive === 1;

  return (
    <div
      className={cn(
        "flex w-full",
        !isActive && "pointer-events-none",
        isNeighbor && "scale-[0.98] opacity-80",
      )}
      style={
        distanceFromActive > 1 ? { contentVisibility: "hidden" } : undefined
      }
      aria-hidden={!isActive}
    >
      {isMounted ? (
        <MatchDetailContent
          match={match}
          voters={voters}
          prediction={prediction}
          matchPredictions={matchPredictions}
          currentUserId={currentUserId}
          teamColors={teamColors}
          canPredict={canPredict}
          isActive={isActive}
        />
      ) : null}
    </div>
  );
});
