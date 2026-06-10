"use client";

import { memo, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GroupStanding } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import {
  toPredictionFormInitial,
  type PredictionDetail,
} from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { shouldRevealMatchPredictions } from "@/features/matches/lib/shouldRevealMatchPredictions";
import { GroupStandingsCard } from "@/features/matches/ui/GroupStandingsList";
import { MatchEventsTimeline } from "@/features/matches/ui/MatchEventsTimeline";
import { MatchPredictionsLeaderboard } from "@/features/matches/ui/MatchPredictionsLeaderboard";
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
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { createOutcomeMessages } from "@/shared/lib/i18n/outcome-messages";
import type { Locale } from "@/shared/types/database";
import { cn } from "@/lib/utils";

interface MatchDetailContentProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  matchPredictions?: MatchPredictionEntry[];
  matchEvents?: MatchEvent[];
  currentUserId?: string | null;
  teamColors?: Record<string, string>;
  canPredict?: boolean;
  canSeePlayerNames?: boolean;
  isActive?: boolean;
  groupStanding?: GroupStanding;
  expanded?: boolean;
  onRequestExpand?: () => void;
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
  locale,
  outcomeMessages,
  t,
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
  locale: Locale;
  outcomeMessages: ReturnType<typeof createOutcomeMessages>;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  return (
    <div className="col-start-2 row-span-2 flex min-w-20 flex-col items-center justify-center gap-1 self-center">
      {prediction ? (
        <p className="line-clamp-2 text-center text-lg font-bold leading-tight text-white">
          {formatOutcomeWins(
            prediction.outcome,
            homeTeamName,
            awayTeamName,
            outcomeMessages,
          )}
        </p>
      ) : locked ? (
        <p className="text-lg font-medium text-white/60">{t("missed")}</p>
      ) : (
        <p className="text-lg font-medium text-red-300">{t("noPick")}</p>
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
              {liveMinute ? t("liveMinute", { minute: liveMinute }) : t("live")}
            </Badge>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-white/70">
        {formatMatchTime(kickoffAt, locale)}
        <span className="mx-1 text-white/35">·</span>
        {formatMatchKickoffDate(kickoffAt, locale)}
      </p>
    </div>
  );
}

function formatMatchSubtitle(
  match: Match,
  t: ReturnType<typeof useTranslations<"matches">>,
): string {
  if (match.round_key.startsWith("group_")) {
    return match.match_number != null
      ? t("groupStageMatch", { number: match.match_number })
      : t("groupStage");
  }

  if (match.match_number != null) {
    return t("roundMatch", {
      round: match.round_display,
      number: match.match_number,
    });
  }

  return match.round_display;
}

function LockedPredictionSummary({
  prediction,
  homeTeamName,
  awayTeamName,
  finished,
  outcomeMessages,
  t,
}: {
  prediction: PredictionDetail | undefined;
  homeTeamName: string;
  awayTeamName: string;
  finished: boolean;
  outcomeMessages: ReturnType<typeof createOutcomeMessages>;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (!prediction) {
    return <p className="text-sm text-white/70">{t("noPrediction")}</p>;
  }

  const points = prediction.points_awarded;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-bold leading-tight text-white">
        {formatOutcomeWins(
          prediction.outcome,
          homeTeamName,
          awayTeamName,
          outcomeMessages,
        )}
      </p>
      {finished && points !== null && (
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            points > 0 ? "text-emerald-300" : "text-white/60",
          )}
        >
          {points > 0
            ? t("ptsPositive", { count: points })
            : t("pts", { count: points })}
        </p>
      )}
    </div>
  );
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
  canSeePlayerNames = true,
  isActive = true,
  groupStanding,
  expanded = false,
  onRequestExpand,
}: MatchDetailContentProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("matches");
  const tOutcome = useTranslations("match.outcome");
  const outcomeMessages = useMemo(
    () => createOutcomeMessages(tOutcome),
    [tOutcome],
  );

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
  const predictionsRevealed = shouldRevealMatchPredictions(match);
  const showPredictionSection =
    !locked || canPredict || predictionsRevealed;

  return (
    <div
      className={cn(
        "match-drawer-card corner-squircle relative flex h-full w-full flex-col",
        expanded && "rounded-none border-0 shadow-none",
      )}
    >
      <MatchTeamBackground
        homeTeamName={match.home_team_name}
        awayTeamName={match.away_team_name}
        teamColors={teamColors}
        animate={isActive}
      />

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col px-4",
          expanded
            ? "overflow-y-auto overscroll-contain pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            : "overflow-hidden pb-4 pt-2",
        )}
      >
        <section className="flex shrink-0 flex-col gap-2 pb-4">
          <p className="line-clamp-1 text-center text-[11px] uppercase tracking-wide text-white/70">
            {formatMatchSubtitle(match, t)}
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
              locale={locale}
              outcomeMessages={outcomeMessages}
              t={t}
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

        {showPredictionSection && (
          <section className="flex shrink-0 flex-col border-t border-white/10 pt-4">
            <h2 className="mb-3 shrink-0 font-heading text-base font-medium text-white">
              {predictionsRevealed ? t("predictions") : t("yourPrediction")}
            </h2>

            <div className="flex flex-col">
              {locked ? (
                predictionsRevealed ? (
                  <MatchPredictionsLeaderboard
                    match={match}
                    predictions={matchPredictions}
                    currentUserId={currentUserId}
                    canSeePlayerNames={canSeePlayerNames}
                  />
                ) : (
                  <LockedPredictionSummary
                    prediction={prediction}
                    homeTeamName={match.home_team_name}
                    awayTeamName={match.away_team_name}
                    finished={finished}
                    outcomeMessages={outcomeMessages}
                    t={t}
                  />
                )
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
        )}

        <section className="flex shrink-0 flex-col border-t border-white/10 pt-4">
          <Tabs
            defaultValue={defaultMatchTab}
            onValueChange={() => {
              if (!expanded) {
                onRequestExpand?.();
              }
            }}
            className="flex flex-col gap-3"
          >
            <TabsList
              onClick={() => {
                if (!expanded) {
                  onRequestExpand?.();
                }
              }}
              className="flex h-auto w-full shrink-0 bg-white/10 p-1 group-data-horizontal/tabs:h-auto"
            >
              {groupStanding && (
                <TabsTrigger value="standings" className={matchTabClassName}>
                  {t("standings")}
                </TabsTrigger>
              )}
              <TabsTrigger value="lineups" className={matchTabClassName}>
                {t("lineups")}
              </TabsTrigger>
              <TabsTrigger value="updates" className={matchTabClassName}>
                {t("updates")}
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
