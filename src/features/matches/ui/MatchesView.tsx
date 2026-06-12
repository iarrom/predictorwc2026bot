"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildGroupStandings } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import { formatMatchSubtitle } from "@/features/matches/lib/formatMatchSubtitle";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { useLiveRefresh } from "@/shared/lib/supabase/useLiveRefresh";
import { GroupStandingsList } from "@/features/matches/ui/GroupStandingsList";
import { MatchDrawer } from "@/features/matches/ui/MatchDrawer";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  formatMatchDateHeader,
  formatMatchTime,
  getDateGroupKey,
  getMatchDayBucket,
  type MatchDayBucket,
} from "@/shared/lib/formatDate";
import { livePredictionTextClass } from "@/features/matches/lib/livePredictionTone";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { createOutcomeMessages } from "@/shared/lib/i18n/outcome-messages";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import type { Locale } from "@/shared/types/database";

interface MatchesViewProps {
  matches: Match[];
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  canPredict: boolean;
  canSeePlayerNames: boolean;
}

const TAB_KEYS: MatchDayBucket[] = ["past", "upcoming3days", "future"];

const FLAG_SIZE = 28;
const MATCH_CARD_MIN_H = "min-h-[7rem]";
const matchCardGridClassName =
  "grid w-full grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-start gap-x-2";

function getDefaultTab(matches: Match[]): MatchDayBucket {
  if (
    matches.some(
      (match) => getMatchDayBucket(match.kickoff_at) === "upcoming3days",
    )
  ) {
    return "upcoming3days";
  }
  if (matches.some((match) => getMatchDayBucket(match.kickoff_at) === "future")) {
    return "future";
  }
  return "past";
}

function toggleCollapsed(
  collapsed: Set<string>,
  dateKey: string,
): Set<string> {
  const next = new Set(collapsed);
  if (next.has(dateKey)) {
    next.delete(dateKey);
  } else {
    next.add(dateKey);
  }
  return next;
}

function MatchTimeBadge({
  kickoffAt,
  locale,
  live,
  liveMinute,
  t,
}: {
  kickoffAt: string;
  locale: Locale;
  live: boolean;
  liveMinute: string | null;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (live) {
    return (
      <Badge
        variant="secondary"
        className="h-4 shrink-0 rounded-md border-0 bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-300 tabular-nums"
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-red-400 motion-safe:animate-pulse"
        />
        {liveMinute ?? t("live")}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="h-4 shrink-0 rounded-md border-0 bg-white/10 px-1.5 text-[10px] font-medium text-foreground tabular-nums"
    >
      {formatMatchTime(kickoffAt, locale)}
    </Badge>
  );
}

function MatchCenterFocus({
  prediction,
  locked,
  live,
  finished,
  homeScore,
  awayScore,
  homeTeamName,
  awayTeamName,
  points,
  outcomeMessages,
  t,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  live: boolean;
  finished: boolean;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
  points: number | null;
  outcomeMessages: ReturnType<typeof createOutcomeMessages>;
  t: ReturnType<typeof useTranslations<"matches">>;
}) {
  if (finished) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 self-center">
        <p className="w-full text-center text-[17px] font-bold leading-none tabular-nums">
          {formatMatchScore(homeScore, awayScore)}
        </p>
        {prediction ? (
          <span
            className={cn(
              "text-center text-[11px] font-semibold leading-none tabular-nums",
              points && points > 0 ? "text-emerald-300" : "text-muted-foreground",
            )}
          >
            {points && points > 0
              ? t("ptsPositive", { count: points })
              : t("pts", { count: points ?? 0 })}
          </span>
        ) : (
          <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
            {locked ? t("missed") : t("noPick")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-1.5 self-center">
      {prediction ? (
        <>
          <p
            className={cn(
              "w-full truncate text-center text-[13px] font-semibold leading-tight",
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
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
            {t("myPick")}
          </span>
        </>
      ) : locked ? (
        <p className="text-center text-[13px] font-medium text-muted-foreground">
          {t("missed")}
        </p>
      ) : (
        <p className="text-center text-[13px] font-medium text-red-300">
          {t("noPick")}
        </p>
      )}

      {live && (
        <p className="w-full text-center text-[17px] font-bold leading-none tabular-nums text-white">
          {formatMatchScore(homeScore, awayScore)}
        </p>
      )}
    </div>
  );
}

export function MatchesView({
  matches,
  voterMap,
  predictionMap,
  predictionsByMatch,
  eventsByMatch,
  currentUserId,
  teamColors,
  canPredict,
  canSeePlayerNames,
}: MatchesViewProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("matches");
  const tOutcome = useTranslations("match.outcome");
  const outcomeMessages = useMemo(
    () => createOutcomeMessages(tOutcome),
    [tOutcome],
  );

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useLiveRefresh("matches-live", "matches", "predictions", "match_events");

  const [activeTab, setActiveTab] = useState<MatchDayBucket>(() =>
    getDefaultTab(matches),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const tabLabels: Record<MatchDayBucket, string> = {
    past: t("tabPast"),
    upcoming3days: t("tabUpcoming3days"),
    future: t("tabFuture"),
  };

  const emptyDescriptions: Record<MatchDayBucket, string> = {
    past: t("emptyPast"),
    upcoming3days: t("emptyUpcoming3days"),
    future: t("emptyFuture"),
  };

  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (match) => getMatchDayBucket(match.kickoff_at) === activeTab,
      ),
    [matches, activeTab],
  );

  const drawerMatchId = useMemo(() => {
    if (!selectedMatchId) {
      return null;
    }

    return filteredMatches.some((match) => match.id === selectedMatchId)
      ? selectedMatchId
      : null;
  }, [filteredMatches, selectedMatchId]);

  const groupStandings = useMemo(
    () => buildGroupStandings(matches),
    [matches],
  );

  const groupStandingsByName = useMemo(
    () => Object.fromEntries(groupStandings.map((group) => [group.groupName, group])),
    [groupStandings],
  );

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Match[]>();

    for (const match of filteredMatches) {
      const key = getDateGroupKey(match.kickoff_at);
      const list = groups.get(key) ?? [];
      list.push(match);
      groups.set(key, list);
    }

    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredMatches]);

  const openMatch = useCallback(
    (matchId: string) => {
      const match = matches.find((item) => item.id === matchId);
      if (match) {
        setActiveTab(getMatchDayBucket(match.kickoff_at));
      }
      setSelectedMatchId(matchId);
    },
    [matches],
  );

  const closeMatch = useCallback(() => {
    setSelectedMatchId(null);
  }, []);

  const handleMatchChange = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
  }, []);

  const handleTabChange = (tab: MatchDayBucket) => {
    setActiveTab(tab);

    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (!match || getMatchDayBucket(match.kickoff_at) !== tab) {
      setSelectedMatchId(null);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
      <div
        className="sports-panel corner-squircle sticky top-0 z-20 flex shrink-0 px-3 py-2.5"
        role="tablist"
        aria-label={t("scheduleTabs")}
      >
        {TAB_KEYS.map((tabKey) => {
          const isActive = activeTab === tabKey;

          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tabKey)}
              className={cn(
                "flex-1 px-0.5 py-1 text-center text-[15px] leading-none whitespace-nowrap transition-colors",
                isActive
                  ? "font-semibold text-foreground"
                  : "font-normal text-white/40 hover:text-white/55",
              )}
            >
              {tabLabels[tabKey]}
            </button>
          );
        })}
      </div>

      <div className="sports-panel corner-squircle mt-3 flex flex-col">
        {groupedByDate.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {emptyDescriptions[activeTab]}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          groupedByDate.map(([dateKey, dayMatches], groupIndex) => {
            const isCollapsed = collapsed.has(dateKey);

            return (
              <section key={dateKey}>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => toggleCollapsed(prev, dateKey))
                  }
                  className={cn(
                    "flex w-full items-center justify-center gap-0.5 border-t border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-[13px] font-bold text-foreground transition-colors hover:bg-white/[0.08]",
                    groupIndex === 0 && "border-t-0",
                  )}
                  aria-expanded={!isCollapsed}
                >
                  <span>
                    {formatMatchDateHeader(dayMatches[0].kickoff_at, locale)}
                  </span>
                  {groupIndex > 0 && (
                    <HugeiconsIcon
                      icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
                      className="size-3 text-muted-foreground"
                    />
                  )}
                </button>

                {!isCollapsed &&
                  dayMatches.map((match) => {
                    const prediction = predictionMap[match.id];
                    const voters = voterMap[match.id] ?? { count: 0 };
                    const locked = new Date(match.kickoff_at) <= new Date();
                    const live =
                      match.status === "live" &&
                      match.home_score !== null &&
                      match.away_score !== null;
                    const finished =
                      match.status === "finished" &&
                      match.home_score !== null &&
                      match.away_score !== null;
                    const isSelected = selectedMatchId === match.id;
                    const points = finished
                      ? (predictionMap[match.id]?.points_awarded ?? null)
                      : null;
                    const liveMinute = formatLiveMinute(match.minute, match.injury_time);

                    return (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => openMatch(match.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex w-full flex-col items-stretch justify-center px-3 py-2 text-left transition-colors hover:bg-white/[0.03]",
                          MATCH_CARD_MIN_H,
                          "border-t border-white/[0.08]",
                          isSelected && "bg-white/[0.05]",
                        )}
                      >
                        <div className="mb-1.5 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-2">
                          <div className="flex min-w-0 items-center justify-start">
                            <MatchVoters voters={voters} compact />
                          </div>

                          <p className="truncate text-center text-[11px] leading-tight text-muted-foreground">
                            {formatMatchSubtitle(match, t)}
                          </p>

                          <div className="flex min-w-0 items-center justify-end">
                            <MatchTimeBadge
                              kickoffAt={match.kickoff_at}
                              locale={locale}
                              live={live}
                              liveMinute={liveMinute}
                              t={t}
                            />
                          </div>
                        </div>

                        <div className={matchCardGridClassName}>
                          <div className="flex min-w-0 flex-col items-center gap-1.5">
                            <TeamFlag
                              name={match.home_team_name}
                              size={FLAG_SIZE}
                            />
                            <p className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight">
                              {match.home_team_name}
                            </p>
                          </div>

                          <MatchCenterFocus
                            prediction={prediction}
                            locked={locked}
                            live={live}
                            finished={finished}
                            homeScore={match.home_score ?? 0}
                            awayScore={match.away_score ?? 0}
                            homeTeamName={match.home_team_name}
                            awayTeamName={match.away_team_name}
                            points={points}
                            outcomeMessages={outcomeMessages}
                            t={t}
                          />

                          <div className="flex min-w-0 flex-col items-center gap-1.5">
                            <TeamFlag
                              name={match.away_team_name}
                              size={FLAG_SIZE}
                            />
                            <p className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight">
                              {match.away_team_name}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </section>
            );
          })
        )}
      </div>

      <GroupStandingsList groups={groupStandings} />

      <MatchDrawer
        matches={filteredMatches}
        matchId={drawerMatchId}
        voterMap={voterMap}
        predictionMap={predictionMap}
        predictionsByMatch={predictionsByMatch}
        eventsByMatch={eventsByMatch}
        currentUserId={currentUserId}
        teamColors={teamColors}
        canPredict={canPredict}
        canSeePlayerNames={canSeePlayerNames}
        groupStandingsByName={groupStandingsByName}
        onMatchChange={handleMatchChange}
        onClose={closeMatch}
      />
    </div>
  );
}
