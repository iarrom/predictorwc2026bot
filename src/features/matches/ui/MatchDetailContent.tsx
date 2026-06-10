"use client";

import { memo } from "react";
import type { GroupStanding } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import {
  toPredictionFormInitial,
  type PredictionDetail,
} from "@/features/matches/lib/predictionDetail";
import { GroupStandingsCard } from "@/features/matches/ui/GroupStandingsList";
import { MatchPredictionsBoard } from "@/features/matches/ui/MatchPredictionsBoard";
import { MatchEventsTimeline } from "@/features/matches/ui/MatchEventsTimeline";
import { MatchLineups } from "@/features/matches/ui/MatchLineups";
import { MatchTeamBackground } from "@/features/matches/ui/MatchTeamBackground";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { PredictionForm } from "@/features/predictions/ui/PredictionForm";
import {
  formatMatchKickoffDate,
  formatMatchTime,
} from "@/shared/lib/formatDate";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";

interface MatchDetailContentProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  matchPredictions?: MatchPredictionEntry[];
  matchEvents?: MatchEvent[];
  currentUserId?: string | null;
  teamColors?: Record<string, string>;
  canPredict?: boolean;
  isActive?: boolean;
  groupStanding?: GroupStanding;
}

const matchTabClassName =
  "min-h-9 flex-1 text-xs text-white/60 hover:text-white data-active:bg-white/20 data-active:text-white dark:text-white/60 dark:hover:text-white dark:data-active:bg-white/20 dark:data-active:text-white";

function MatchDetailCenterFocus({
  prediction,
  locked,
  showScore,
  live,
  homeScore,
  awayScore,
  kickoffAt,
  homeTeamName,
  awayTeamName,
  liveMinute,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  showScore: boolean;
  live: boolean;
  homeScore: number;
  awayScore: number;
  kickoffAt: string;
  homeTeamName: string;
  awayTeamName: string;
  liveMinute: string | null;
}) {
  return (
    <div className="col-start-2 row-span-2 flex min-w-20 flex-col items-center justify-center gap-1 self-center">
      {prediction ? (
        <p className="line-clamp-2 text-center text-lg font-bold leading-tight text-white">
          {formatOutcomeWins(
            prediction.outcome,
            homeTeamName,
            awayTeamName,
          )}
        </p>
      ) : locked ? (
        <p className="text-lg font-medium text-white/60">Missed</p>
      ) : (
        <p className="text-lg font-medium text-red-300">No pick</p>
      )}

      {showScore && (
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium leading-none tabular-nums text-white/70">
            {formatMatchScore(homeScore, awayScore)}
          </p>
          {live && (
            <Badge
              variant="destructive"
              className="h-5 rounded-md border-0 bg-red-500/20 px-2 text-[10px] font-semibold text-red-300"
            >
              {liveMinute ? `LIVE ${liveMinute}` : "LIVE"}
            </Badge>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-white/70">
        {formatMatchTime(kickoffAt)}
        <span className="mx-1 text-white/35">·</span>
        {formatMatchKickoffDate(kickoffAt)}
      </p>
    </div>
  );
}

function formatMatchSubtitle(match: Match): string {
  if (match.round_key.startsWith("group_")) {
    return match.match_number != null
      ? `Group Stage · Match ${match.match_number}`
      : "Group Stage";
  }

  if (match.match_number != null) {
    return `${match.round_display} · Match ${match.match_number}`;
  }

  return match.round_display;
}

export const MatchDetailContent = memo(function MatchDetailContent({
  match,
  voters,
  prediction,
  matchPredictions = [],
  matchEvents = [],
  currentUserId,
  teamColors = {},
  canPredict = false,
  isActive = true,
  groupStanding,
}: MatchDetailContentProps) {
  const locked = new Date(match.kickoff_at) <= new Date();
  const live =
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null;
  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const showScore = live || finished;
  const liveMinute = formatLiveMinute(match.minute, match.injury_time);
  const defaultMatchTab = groupStanding
    ? "standings"
    : live || finished
      ? "updates"
      : "lineups";

  return (
    <div className="match-drawer-card corner-squircle relative flex max-h-[calc(92dvh-5rem)] w-full flex-col">
      <MatchTeamBackground
        homeTeamName={match.home_team_name}
        awayTeamName={match.away_team_name}
        teamColors={teamColors}
        animate={isActive}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
        <section className="flex shrink-0 flex-col gap-2 pb-4">
          <p className="line-clamp-1 text-center text-[11px] uppercase tracking-wide text-white/70">
            {formatMatchSubtitle(match)}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-3 gap-y-1.5">
            <div className="col-start-1 row-start-1 flex justify-center">
              <TeamFlag name={match.home_team_name} size={44} />
            </div>

            <MatchDetailCenterFocus
              prediction={prediction}
              locked={locked}
              showScore={showScore}
              live={live}
              homeScore={match.home_score ?? 0}
              awayScore={match.away_score ?? 0}
              kickoffAt={match.kickoff_at}
              homeTeamName={match.home_team_name}
              awayTeamName={match.away_team_name}
              liveMinute={liveMinute}
            />

            <div className="col-start-3 row-start-1 flex justify-center">
              <TeamFlag name={match.away_team_name} size={44} />
            </div>

            <p className="col-start-1 row-start-2 line-clamp-2 text-center text-sm font-semibold leading-tight text-white">
              {match.home_team_name}
            </p>

            <p className="col-start-3 row-start-2 line-clamp-2 text-center text-sm font-semibold leading-tight text-white">
              {match.away_team_name}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="line-clamp-1 text-center text-xs text-white/65">
              {match.venue ?? "\u00a0"}
            </p>

            <MatchVoters voters={voters} />
          </div>
        </section>

        <section className="flex shrink-0 flex-col border-t border-white/10 pt-4">
          <h2 className="mb-3 shrink-0 font-heading text-base font-medium text-white">
            {locked ? "Predictions" : "Your prediction"}
          </h2>

          <div className="flex flex-col">
            {locked ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <MatchPredictionsBoard
                  match={match}
                  predictions={matchPredictions}
                  currentUserId={currentUserId}
                />
              </div>
            ) : (
              <PredictionForm
                matchId={match.id}
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                initial={
                  prediction ? toPredictionFormInitial(prediction) : undefined
                }
                locked={false}
                canPredict={canPredict}
              />
            )}
          </div>
        </section>

        <section className="flex shrink-0 flex-col border-t border-white/10 pt-4">
          <Tabs defaultValue={defaultMatchTab} className="flex flex-col gap-3">
            <TabsList className="flex h-auto w-full shrink-0 bg-white/10 p-1 group-data-horizontal/tabs:h-auto">
              {groupStanding && (
                <TabsTrigger value="standings" className={matchTabClassName}>
                  Standings
                </TabsTrigger>
              )}
              <TabsTrigger value="lineups" className={matchTabClassName}>
                Line-ups
              </TabsTrigger>
              <TabsTrigger value="updates" className={matchTabClassName}>
                Updates
              </TabsTrigger>
            </TabsList>

            {groupStanding && (
              <TabsContent value="standings" className="mt-0">
                <GroupStandingsCard
                  group={groupStanding}
                  highlightedTeams={[
                    match.home_team_name,
                    match.away_team_name,
                  ]}
                />
              </TabsContent>
            )}

            <TabsContent value="lineups" className="mt-0">
              <MatchLineups
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                homeLineup={match.home_lineup}
                awayLineup={match.away_lineup}
              />
            </TabsContent>

            <TabsContent value="updates" className="mt-0">
              <MatchEventsTimeline
                events={matchEvents}
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
});
