"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildGroupStandings } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import { formatLiveMinute } from "@/entities/match/lib/formatLiveData";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import { scorePrediction, resolveScoredOutcome } from "@/entities/prediction/lib/scoring";
import { formatMatchSubtitle } from "@/features/matches/lib/formatMatchSubtitle";
import { buildPreviousMatchesByMatch } from "@/features/matches/lib/previousMatches";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import { useLiveRefresh } from "@/shared/lib/supabase/useLiveRefresh";
import { GroupStandingsList } from "@/features/matches/ui/GroupStandingsList";
import { MatchDrawer } from "@/features/matches/ui/MatchDrawer";
import { LiveMinuteIndicator } from "@/features/matches/ui/LiveMinuteIndicator";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
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
  getRelativeDayOffset,
  type MatchDayBucket,
} from "@/shared/lib/formatDate";
import { isMatchUpsetWatch } from "@/shared/lib/onside/upsets";
import { livePredictionTextClass } from "@/features/matches/lib/livePredictionTone";
import { MatchScoreDigit, MatchScoreStatus } from "@/shared/ui/MatchScoreDisplay";
import {
  formatMatchScore,
  hasPenaltyShootout,
  resolveDisplayScore,
} from "@/shared/lib/formatMatchScore";
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
  playerPhotosByTeam: PlayerPhotosByTeam;
  canPredict: boolean;
  canSeePlayerNames: boolean;
  upsetMatchIds: Set<string>;
}

const TAB_KEYS: MatchDayBucket[] = ["past", "upcoming3days", "future"];
const PAST_VISIBLE_DAYS = 3;

const FLAG_SIZE = 28;
const MATCH_CARD_MIN_H = "min-h-[7rem]";
const matchCardGridClassName =
  "grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2";

function isLiveMatch(match: Match): boolean {
  return (
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function losingSideForMatchCard(
  match: Match,
  finished: boolean,
  live: boolean,
  displayScore: { home: number; away: number },
): "home" | "away" | null {
  if (finished) {
    const outcome = resolveScoredOutcome({
      round_key: match.round_key,
      home_score: match.home_score,
      away_score: match.away_score,
      winner: match.winner,
    });
    if (outcome === "home") return "away";
    if (outcome === "away") return "home";
    return null;
  }

  if (live) {
    if (displayScore.home > displayScore.away) return "away";
    if (displayScore.away > displayScore.home) return "home";
  }

  return null;
}

function bucketForMatch(match: Match): MatchDayBucket {
  if (match.status === "finished") return "past";
  return getMatchDayBucket(match.kickoff_at);
}

function getDefaultTab(matches: Match[]): MatchDayBucket {
  if (matches.some((match) => bucketForMatch(match) === "upcoming3days")) {
    return "upcoming3days";
  }
  if (matches.some((match) => bucketForMatch(match) === "future")) {
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

function MatchCardScoreMeta({
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
    if (prediction) {
      return (
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
      );
    }

    if (!locked) {
      return (
        <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
          {t("noPick")}
        </span>
      );
    }

    return (
      <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
        {t("missed")}
      </span>
    );
  }

  if (prediction) {
    return (
      <span
        className={cn(
          "w-full truncate text-center text-[11px] font-semibold leading-none",
          live
            ? livePredictionTextClass(
                live,
                prediction.outcome,
                homeScore,
                awayScore,
              )
            : "text-muted-foreground",
        )}
      >
        {live
          ? formatOutcomeWins(
              prediction.outcome,
              homeTeamName,
              awayTeamName,
              outcomeMessages,
            )
          : t("myPick")}
      </span>
    );
  }

  if (!locked) {
    return (
      <span
        className={cn(
          "text-center text-[11px] font-medium leading-none",
          live ? "text-red-300" : "text-muted-foreground",
        )}
      >
        {t("noPick")}
      </span>
    );
  }

  return (
    <span className="text-center text-[11px] font-medium leading-none text-muted-foreground">
      {t("missed")}
    </span>
  );
}

function MatchCardTeamBlock({
  name,
  flagSize,
  className,
}: {
  name: string;
  flagSize: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-[5.5rem] shrink-0 flex-col items-center gap-1.5",
        className,
      )}
    >
      <TeamFlag name={name} size={flagSize} />
      <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-white/85">
        {name}
      </span>
    </div>
  );
}

function renderMatchCard({
  match,
  prediction,
  voters,
  isSelected,
  isUpsetWatch = false,
  locale,
  outcomeMessages,
  t,
  onOpen,
}: {
  match: Match;
  prediction: PredictionDetail | undefined;
  voters: MatchVoterInfo;
  isSelected: boolean;
  isUpsetWatch?: boolean;
  locale: Locale;
  outcomeMessages: ReturnType<typeof createOutcomeMessages>;
  t: ReturnType<typeof useTranslations<"matches">>;
  onOpen: (matchId: string) => void;
}) {
  const locked = new Date(match.kickoff_at) <= new Date();
  const live = isLiveMatch(match);
  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const points =
    finished && prediction
      ? (prediction.points_awarded ??
        scorePrediction(prediction.outcome, {
          round_key: match.round_key,
          home_score: match.home_score,
          away_score: match.away_score,
          winner: match.winner,
        }))
      : null;
  const liveMinute = formatLiveMinute(match.minute, match.injury_time);
  const showScore = live || finished;
  const showPenalties = finished && hasPenaltyShootout(match);
  const displayScore = resolveDisplayScore(match);
  const losingSide = losingSideForMatchCard(match, finished, live, displayScore);

  return (
    <button
      type="button"
      onClick={() => onOpen(match.id)}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full flex-col justify-center px-3 py-2 text-left transition-colors hover:bg-white/[0.03]",
        MATCH_CARD_MIN_H,
        "border-t border-white/[0.08]",
        isSelected && "bg-white/[0.05]",
      )}
    >
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
        <div className="flex min-w-0 items-center justify-start">
          {!finished && <MatchVoters voters={voters} compact />}
        </div>

        <p className="truncate text-center text-[11px] leading-tight text-muted-foreground">
          {formatMatchSubtitle(match, t)}
        </p>

        <div className="flex min-w-0 items-center justify-end gap-1">
          {isUpsetWatch && !finished ? (
            <span
              aria-label={t("upsetWatch")}
              className="text-sm leading-none"
              role="img"
            >
              🔥
            </span>
          ) : null}
        </div>
      </div>

      <div className={matchCardGridClassName}>
        <div className="flex min-w-0 items-start gap-1.5">
          <MatchCardTeamBlock
            name={match.home_team_name}
            flagSize={FLAG_SIZE}
          />
          {showScore && (
            <MatchScoreDigit
              value={displayScore.home}
              size={FLAG_SIZE}
              className={cn(
                "ml-auto text-white",
                losingSide === "home" && "opacity-45",
              )}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1 self-start px-1">
          <div
            className="flex items-center justify-center"
            style={{ height: FLAG_SIZE }}
          >
            {live ? (
              <LiveMinuteIndicator
                liveMinute={liveMinute}
                liveLabel={t("live")}
                className="text-[11px] font-semibold text-red-300"
              />
            ) : finished ? (
              <div className="flex flex-col items-center gap-0.5">
                <MatchScoreStatus className="text-[13px] text-foreground">
                  {t("finished")}
                </MatchScoreStatus>
                {showPenalties && (
                  <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                    {t("penaltiesShort")}{" "}
                    {formatMatchScore(
                      match.home_penalties!,
                      match.away_penalties!,
                    )}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[15px] font-semibold leading-none tabular-nums text-foreground">
                {formatMatchTime(match.kickoff_at, locale)}
              </span>
            )}
          </div>
          <MatchCardScoreMeta
            prediction={prediction}
            locked={locked}
            live={live}
            finished={finished}
            homeScore={displayScore.home}
            awayScore={displayScore.away}
            homeTeamName={match.home_team_name}
            awayTeamName={match.away_team_name}
            points={points}
            outcomeMessages={outcomeMessages}
            t={t}
          />
        </div>

        <div className="flex min-w-0 items-start gap-1.5">
          {showScore && (
            <MatchScoreDigit
              value={displayScore.away}
              size={FLAG_SIZE}
              className={cn(
                "text-white",
                losingSide === "away" && "opacity-45",
              )}
            />
          )}
          <MatchCardTeamBlock
            name={match.away_team_name}
            flagSize={FLAG_SIZE}
            className="ml-auto"
          />
        </div>
      </div>
    </button>
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
  playerPhotosByTeam,
  canPredict,
  canSeePlayerNames,
  upsetMatchIds,
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
  const [showAllPast, setShowAllPast] = useState(false);

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

  const liveMatches = useMemo(
    () =>
      matches
        .filter(isLiveMatch)
        .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)),
    [matches],
  );

  const liveMatchIds = useMemo(
    () => new Set(liveMatches.map((match) => match.id)),
    [liveMatches],
  );

  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          bucketForMatch(match) === activeTab && !liveMatchIds.has(match.id),
      ),
    [matches, activeTab, liveMatchIds],
  );

  const drawerMatches = useMemo(
    () => [...liveMatches, ...filteredMatches],
    [liveMatches, filteredMatches],
  );

  const drawerMatchId = useMemo(() => {
    if (!selectedMatchId) {
      return null;
    }

    return drawerMatches.some((match) => match.id === selectedMatchId)
      ? selectedMatchId
      : null;
  }, [drawerMatches, selectedMatchId]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Match[]>();

    for (const match of filteredMatches) {
      const key = getDateGroupKey(match.kickoff_at);
      const list = groups.get(key) ?? [];
      list.push(match);
      groups.set(key, list);
    }

    const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    return activeTab === "past" ? sorted.reverse() : sorted;
  }, [filteredMatches, activeTab]);

  const visibleGroups = useMemo(
    () =>
      activeTab === "past" && !showAllPast
        ? groupedByDate.slice(0, PAST_VISIBLE_DAYS)
        : groupedByDate,
    [activeTab, groupedByDate, showAllPast],
  );

  const hasMorePast =
    activeTab === "past" &&
    !showAllPast &&
    groupedByDate.length > PAST_VISIBLE_DAYS;

  const groupStandings = useMemo(
    () => buildGroupStandings(matches),
    [matches],
  );

  const groupStandingsByName = useMemo(
    () => Object.fromEntries(groupStandings.map((group) => [group.groupName, group])),
    [groupStandings],
  );

  const previousMatchesByMatch = useMemo(
    () => buildPreviousMatchesByMatch(matches),
    [matches],
  );

  const openMatch = useCallback(
    (matchId: string) => {
      const match = matches.find((item) => item.id === matchId);
      if (match) {
        setActiveTab(bucketForMatch(match));
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
    setShowAllPast(false);

    if (!selectedMatchId) {
      return;
    }

    const match = matches.find((item) => item.id === selectedMatchId);
    if (
      !match ||
      (isLiveMatch(match) ? false : bucketForMatch(match) !== tab)
    ) {
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
        {liveMatches.length === 0 && groupedByDate.length === 0 ? (
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>
                {emptyDescriptions[activeTab]}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <section>
                <div className="flex w-full items-center justify-center gap-1.5 border-b border-white/[0.08] px-3 py-2.5 text-[13px] font-semibold text-foreground">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-red-400 animate-pulse"
                    aria-hidden
                  />
                  <span>{t("liveNow")}</span>
                </div>

                {liveMatches.map((match) => (
                  <div key={match.id}>
                    {renderMatchCard({
                      match,
                      prediction: predictionMap[match.id],
                      voters: voterMap[match.id] ?? { count: 0 },
                      isSelected: selectedMatchId === match.id,
                      isUpsetWatch: isMatchUpsetWatch(match, upsetMatchIds),
                      locale,
                      outcomeMessages,
                      t,
                      onOpen: openMatch,
                    })}
                  </div>
                ))}
              </section>
            )}

            {visibleGroups.map(([dateKey, dayMatches], groupIndex) => {
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
                    groupIndex === 0 && liveMatches.length === 0 && "border-t-0",
                  )}
                  aria-expanded={!isCollapsed}
                >
                  <span>
                    {(() => {
                      const kickoffAt = dayMatches[0].kickoff_at;
                      const offset = getRelativeDayOffset(kickoffAt);
                      if (offset === 0) return t("today");
                      if (offset === 1) return t("tomorrow");
                      return formatMatchDateHeader(kickoffAt, locale);
                    })()}
                  </span>
                  {groupIndex > 0 && (
                    <HugeiconsIcon
                      icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
                      className="size-3 text-muted-foreground"
                    />
                  )}
                </button>

                {!isCollapsed &&
                  dayMatches.map((match) => (
                    <div key={match.id}>
                      {renderMatchCard({
                        match,
                        prediction: predictionMap[match.id],
                        voters: voterMap[match.id] ?? { count: 0 },
                        isSelected: selectedMatchId === match.id,
                        isUpsetWatch: isMatchUpsetWatch(match, upsetMatchIds),
                        locale,
                        outcomeMessages,
                        t,
                        onOpen: openMatch,
                      })}
                    </div>
                  ))}
              </section>
            );
          })}

            {hasMorePast && (
              <button
                type="button"
                onClick={() => setShowAllPast(true)}
                className="border-t border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-center text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white/75"
              >
                {t("showMore")}
              </button>
            )}
          </>
        )}
      </div>

      <GroupStandingsList groups={groupStandings} />

      <MatchDrawer
        matches={drawerMatches}
        matchId={drawerMatchId}
        voterMap={voterMap}
        predictionMap={predictionMap}
        predictionsByMatch={predictionsByMatch}
        eventsByMatch={eventsByMatch}
        currentUserId={currentUserId}
        teamColors={teamColors}
        playerPhotosByTeam={playerPhotosByTeam}
        canPredict={canPredict}
        canSeePlayerNames={canSeePlayerNames}
        groupStandingsByName={groupStandingsByName}
        previousMatchesByMatch={previousMatchesByMatch}
        upsetMatchIds={upsetMatchIds}
        onMatchChange={handleMatchChange}
        onClose={closeMatch}
      />
    </div>
  );
}
