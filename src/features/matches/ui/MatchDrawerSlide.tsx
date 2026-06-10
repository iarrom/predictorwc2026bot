"use client";

import { memo } from "react";
import type { GroupStanding } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
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
  matchEvents?: MatchEvent[];
  currentUserId: string | null;
  teamColors: Record<string, string>;
  canPredict: boolean;
  groupStandingsByName: Record<string, GroupStanding>;
  isActive: boolean;
  isMounted: boolean;
  distanceFromActive: number;
  expanded: boolean;
  onRequestExpand: () => void;
}

export const MatchDrawerSlide = memo(function MatchDrawerSlide({
  match,
  voters,
  prediction,
  matchPredictions,
  matchEvents = [],
  currentUserId,
  teamColors,
  canPredict,
  groupStandingsByName,
  isActive,
  isMounted,
  distanceFromActive,
  expanded,
  onRequestExpand,
}: MatchDrawerSlideProps) {
  const isNeighbor = distanceFromActive === 1;

  return (
    <div
      className={cn(
        "flex h-full w-full",
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
          matchEvents={matchEvents}
          currentUserId={currentUserId}
          teamColors={teamColors}
          canPredict={canPredict}
          groupStanding={
            match.group_name
              ? groupStandingsByName[match.group_name]
              : undefined
          }
          isActive={isActive}
          expanded={expanded}
          onRequestExpand={onRequestExpand}
        />
      ) : null}
    </div>
  );
});
