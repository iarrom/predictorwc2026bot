"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import type { Match } from "@/entities/match/model/types";
import type { PredictionOutcome } from "@/entities/prediction/model/types";
import {
  projectPredictionPoints,
  resolveScoredOutcome,
  scorePrediction,
} from "@/entities/prediction/lib/scoring";
import { TIEBREAKER_ROUNDS } from "@/entities/tiebreaker/model/types";
import { formatStageLabel } from "@/features/leaderboard/lib/formatStageLabel";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { getInitials } from "@/features/matches/lib/voterInfo";
import type { ResultsData } from "@/features/results/lib/loadResultsData";
import {
  formatMatchScore,
  hasPenaltyShootout,
  resolveDisplayScore,
} from "@/shared/lib/formatMatchScore";
import { getTeamTicker } from "@/shared/lib/teamTicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResultsMatrixProps {
  data: ResultsData;
}

function resolveEntryPoints(
  entry: MatchPredictionEntry,
  match: Match,
): number | null {
  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  if (match.status === "finished") {
    return (
      entry.points_awarded ??
      scorePrediction(entry.outcome, {
        round_key: match.round_key,
        home_score: match.home_score,
        away_score: match.away_score,
        winner: match.winner,
      })
    );
  }

  if (match.status === "live") {
    return projectPredictionPoints(
      entry.outcome,
      match.home_score,
      match.away_score,
      match.round_key,
    );
  }

  return null;
}

function formatOutcomeTicker(
  outcome: PredictionOutcome,
  match: Match,
  drawLabel: string,
): string {
  if (outcome === "home") return getTeamTicker(match.home_team_name);
  if (outcome === "away") return getTeamTicker(match.away_team_name);
  return drawLabel;
}

function MatchScoreCell({ match }: { match: Match }) {
  const t = useTranslations("results");
  const display = resolveDisplayScore(match);
  const actualOutcome = resolveScoredOutcome({
    round_key: match.round_key,
    home_score: match.home_score,
    away_score: match.away_score,
    winner: match.winner,
  });

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[13px] font-medium leading-tight">
        {match.home_team_name} — {match.away_team_name}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">
          {formatMatchScore(display.home, display.away)}
          {hasPenaltyShootout(match) && (
            <span className="ml-0.5 font-normal text-muted-foreground">
              ({formatMatchScore(match.home_penalties!, match.away_penalties!)})
            </span>
          )}
        </span>
        {actualOutcome && (
          <span>{formatOutcomeTicker(actualOutcome, match, t("draw"))}</span>
        )}
        {match.status === "live" && (
          <Badge className="h-4 px-1.5 text-[10px]">{t("live")}</Badge>
        )}
      </span>
    </div>
  );
}

function PickCell({
  entry,
  match,
  drawLabel,
}: {
  entry: MatchPredictionEntry | undefined;
  match: Match;
  drawLabel: string;
}) {
  if (!entry) {
    return <span className="text-muted-foreground/50">—</span>;
  }

  const points = resolveEntryPoints(entry, match);
  const correct = points !== null && points > 0;

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5",
        correct
          ? "bg-primary/10 font-semibold text-primary"
          : "text-muted-foreground",
      )}
    >
      <span>{formatOutcomeTicker(entry.outcome, match, drawLabel)}</span>
      <span className="text-[11px] tabular-nums">
        {points === null ? "" : correct ? `+${points}` : "0"}
      </span>
    </span>
  );
}

export function ResultsMatrix({ data }: ResultsMatrixProps) {
  const t = useTranslations("results");
  const tStages = useTranslations("leaderboard.stages");

  const players = data.overall;
  const revealableSet = new Set(data.revealableMatchIds);

  const stageSections = [...data.stages]
    .reverse()
    .map((stage) => ({
      stage,
      matches: (data.matchesByStage[stage] ?? [])
        .filter((match) => revealableSet.has(match.id))
        .sort(
          (a, b) =>
            new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime(),
        ),
    }))
    .filter((section) => section.matches.length > 0);

  const revealedTiebreakerRounds = TIEBREAKER_ROUNDS.filter(
    (round) => data.tiebreaker.revealedRounds[round.key],
  );

  const tiebreakerRowByUser = new Map(
    data.tiebreaker.rows.map((row) => [row.userId, row]),
  );

  if (stageSections.length === 0 && revealedTiebreakerRounds.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {t("noRevealedMatches")}
      </p>
    );
  }

  const columnCount = players.length + 1;

  return (
    <div className="relative max-h-[75vh] overflow-auto rounded-xl border">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-30 min-w-[13rem] border-b bg-background px-3 py-2 text-left align-bottom text-xs font-medium text-muted-foreground">
              {t("match")}
            </th>
            {players.map((player) => (
              <th
                key={player.user_id}
                className="sticky top-0 z-20 min-w-[5.5rem] border-b bg-background px-2 py-2 text-center align-bottom"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                    #{player.rank}
                  </span>
                  <Avatar className="size-8">
                    {player.photo_url && (
                      <AvatarImage
                        src={player.photo_url}
                        alt={player.display_name}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(player.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="max-w-[5rem] truncate text-xs font-medium"
                    title={player.display_name}
                  >
                    {player.display_name}
                  </span>
                  <span className="text-base leading-none font-bold tabular-nums">
                    {player.total_points}
                  </span>
                  <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                    Δ {player.tiebreaker_overall ?? "—"}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stageSections.map((section) => (
            <Fragment key={section.stage}>
              <tr>
                <td
                  colSpan={columnCount}
                  className="border-b bg-muted/50 px-0 py-1.5"
                >
                  <span className="sticky left-3 inline-block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {formatStageLabel(section.stage, (key, values) =>
                      tStages(key, values),
                    )}
                  </span>
                </td>
              </tr>
              {section.matches.map((match) => {
                const entries = data.predictionsByMatch[match.id] ?? [];
                const entryByUser = new Map(
                  entries.map((entry) => [entry.user_id, entry]),
                );

                return (
                  <tr key={match.id} className="group">
                    <td className="sticky left-0 z-10 border-b bg-background px-3 py-2 group-hover:bg-muted/30">
                      <MatchScoreCell match={match} />
                    </td>
                    {players.map((player) => (
                      <td
                        key={player.user_id}
                        className="border-b px-2 py-2 text-center group-hover:bg-muted/30"
                      >
                        <PickCell
                          entry={entryByUser.get(player.user_id)}
                          match={match}
                          drawLabel={t("draw")}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}

          {revealedTiebreakerRounds.length > 0 && (
            <>
              <tr key="tiebreaker-header">
                <td
                  colSpan={columnCount}
                  className="border-b bg-muted/50 px-0 py-1.5"
                >
                  <span className="sticky left-3 inline-block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("tabTiebreaker")}
                  </span>
                </td>
              </tr>
              {revealedTiebreakerRounds.map((round) => {
                const actual = data.tiebreaker.actualGoalsByRound[round.key];

                return (
                  <tr key={`tiebreaker-${round.key}`} className="group">
                    <td className="sticky left-0 z-10 border-b bg-background px-3 py-2 group-hover:bg-muted/30">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium leading-tight">
                          {round.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("actual")}:{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {actual ?? "—"}
                          </span>
                        </span>
                      </div>
                    </td>
                    {players.map((player) => {
                      const cell =
                        tiebreakerRowByUser.get(player.user_id)?.perRound[
                          round.key
                        ] ?? null;

                      return (
                        <td
                          key={player.user_id}
                          className="border-b px-2 py-2 text-center tabular-nums group-hover:bg-muted/30"
                        >
                          {cell ? (
                            <span className="inline-flex items-baseline gap-1">
                              <span className="font-medium">
                                {cell.prediction ?? "—"}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Δ{cell.deviation}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
