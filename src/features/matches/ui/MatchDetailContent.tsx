"use client";

import { memo, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { GroupStanding } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import { formatMatchSubtitle } from "@/features/matches/lib/formatMatchSubtitle";
import {
  toPredictionFormInitial,
  type PredictionDetail,
} from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { livePredictionTextClass } from "@/features/matches/lib/livePredictionTone";
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
  groupStanding?: GroupStanding;
  expanded?: boolean;
  onRequestExpand?: () => void;
}

const matchTabClassName =
  "min-h-9 flex-1 rounded-none border-0 bg-transparent px-0 text-xs font-medium text-white/50 shadow-none hover:text-white/80 data-active:bg-transparent data-active:text-white data-active:font-semibold data-active:shadow-none dark:text-white/50 dark:hover:text-white/80 dark:data-active:bg-transparent dark:data-active:text-white";

const matchDetailGridClassName =
  "grid w-full grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-start gap-x-3";

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
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1 self-center">
      {prediction ? (
        <p
          className={cn(
            "w-full truncate text-center text-lg font-bold leading-tight text-white",
            livePredictionTextClass(
              live,
              prediction.outcome,
              homeScore,
              awayScore,
            ),
          )}
        >
          {formatOutcomeWins(
            prediction.outcome,
            homeTeamName,
            awayTeamName,
            outcomeMessages,
          )}
        </p>
      ) : locked ? (
        <p className="w-full text-center text-lg font-medium text-white/60">
          {t("missed")}
        </p>
      ) : (
        <p className="w-full text-center text-lg font-medium text-red-300">
          {t("noPick")}
        </p>
      )}

      {showScore && (
        <p className="w-full text-center text-2xl font-bold leading-none tabular-nums text-white">
          {formatMatchScore(homeScore, awayScore)}
        </p>
      )}

      {live ? (
        <Badge
          variant="destructive"
          className="h-5 rounded-md border-0 bg-red-500/20 px-2 text-[10px] font-semibold text-red-300"
        >
          {liveMinute ? t("liveMinute", { minute: liveMinute }) : t("live")}
        </Badge>
      ) : (
        <p className="text-center text-[11px] text-white/70">
          {formatMatchTime(kickoffAt, locale)}
          <span className="mx-1 text-white/35">·</span>
          {formatMatchKickoffDate(kickoffAt, locale)}
        </p>
      )}
    </div>
  );
}

function LockedPredictionSummary({
  prediction,
  homeTeamName,
  awayTeamName,
  live,
  homeScore,
  awayScore,
  finished,
  outcomeMessages,
  t,
}: {
  prediction: PredictionDetail | undefined;
  homeTeamName: string;
  awayTeamName: string;
  live: boolean;
  homeScore: number;
  awayScore: number;
  finished: boolean;
  outcomeMessages: ReturnType<typeof createOutcomeMessages>;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (!prediction) {
    return (
      <p className="text-center text-sm text-white/70">{t("noPrediction")}</p>
    );
  }

  const points = prediction.points_awarded;

  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <p
        className={cn(
          "w-full truncate text-lg font-bold leading-tight text-white",
          livePredictionTextClass(
            live,
            prediction.outcome,
            homeScore,
            awayScore,
          ),
        )}
      >
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
  const predictionsRevealed = shouldRevealMatchPredictions(match);
  const defaultMatchTab =
    live || finished
      ? "predictions"
      : groupStanding
        ? "standings"
        : "lineups";
  const showPredictionSection = !locked || (locked && !predictionsRevealed);

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
      />

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col px-4",
          expanded
            ? "overflow-y-auto overscroll-contain pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            : "overflow-hidden pb-4 pt-2",
        )}
      >
        <section className="flex shrink-0 flex-col gap-2 pb-5">
          <p className="line-clamp-1 text-center text-[11px] uppercase tracking-wide text-white/70">
            {formatMatchSubtitle(match, t)}
          </p>

          <div className={matchDetailGridClassName}>
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <TeamFlag name={match.home_team_name} size={44} />
              <p className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-white">
                {match.home_team_name}
              </p>
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

            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <TeamFlag name={match.away_team_name} size={44} />
              <p className="line-clamp-2 w-full text-center text-sm font-semibold leading-tight text-white">
                {match.away_team_name}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="line-clamp-1 text-center text-xs text-white/65">
              {match.venue ?? "\u00a0"}
            </p>

            <MatchVoters voters={voters} />
          </div>
        </section>

        {showPredictionSection && (
          <section className="flex shrink-0 flex-col border-t border-white/10 py-5">
            <h2 className="mb-3 shrink-0 text-center font-heading text-base font-medium text-white">
              {t("yourPrediction")}
            </h2>

            <div className="w-full">
              {locked ? (
                <div className="text-center">
                  <LockedPredictionSummary
                    prediction={prediction}
                    homeTeamName={match.home_team_name}
                    awayTeamName={match.away_team_name}
                    live={live}
                    homeScore={match.home_score ?? 0}
                    awayScore={match.away_score ?? 0}
                    finished={finished}
                    outcomeMessages={outcomeMessages}
                    t={t}
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
        )}

        <section className="flex shrink-0 flex-col border-t border-white/10 py-5">
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
              className="flex h-auto w-full shrink-0 justify-start gap-4 bg-transparent p-0 group-data-horizontal/tabs:h-auto"
            >
              <TabsTrigger value="predictions" className={matchTabClassName}>
                {t("predictions")}
              </TabsTrigger>
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

            <TabsContent value="predictions" className="mt-0">
              {predictionsRevealed ? (
                <MatchPredictionsLeaderboard
                  match={match}
                  predictions={matchPredictions}
                  currentUserId={currentUserId}
                  canSeePlayerNames={canSeePlayerNames}
                />
              ) : (
                <p className="text-sm text-white/50">
                  {t("predictionsRevealAfter")}
                </p>
              )}
            </TabsContent>

            {groupStanding && (
              <TabsContent value="standings" className="mt-0">
                <GroupStandingsCard
                  group={groupStanding}
                  variant="transparent"
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
                teamColors={teamColors}
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
});
