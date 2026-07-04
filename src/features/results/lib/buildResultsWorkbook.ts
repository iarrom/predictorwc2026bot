import "server-only";

import ExcelJS from "exceljs";
import type { Match } from "@/entities/match/model/types";
import { isKnockoutRound } from "@/entities/match/lib/isKnockoutRound";
import { formatOutcomeWins } from "@/entities/prediction/lib/formatOutcome";
import {
  projectPredictionPoints,
  scorePrediction,
} from "@/entities/prediction/lib/scoring";
import { formatStageLabel } from "@/features/leaderboard/lib/formatStageLabel";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { shouldRevealMatchPredictions } from "@/features/matches/lib/shouldRevealMatchPredictions";
import type { ResultsData } from "@/features/results/lib/loadResultsData";
import { TIEBREAKER_ROUNDS } from "@/entities/tiebreaker/model/types";
import {
  formatMatchScore,
  hasPenaltyShootout,
  resolveDisplayScore,
} from "@/shared/lib/formatMatchScore";
import { getTeamTicker } from "@/shared/lib/teamTicker";

const STAGE_LABELS: Record<string, string> = {
  groupMatchday: "Group MD {number}",
  roundOf32: "R32",
  roundOf16: "R16",
  quarterFinal: "QF",
  semiFinal: "SF",
  thirdPlace: "3rd",
  final: "Final",
};

function formatStage(roundKey: string): string {
  return formatStageLabel(roundKey, (key, values) => {
    if (key === "groupMatchday") {
      return `Group MD ${values?.number ?? 1}`;
    }
    return STAGE_LABELS[key] ?? roundKey;
  });
}

function formatMatchStatus(match: Match): string {
  if (match.status === "live") return "Live";
  if (match.status === "finished") return "Finished";
  return "Scheduled";
}

function formatMatchScoreCell(match: Match): string {
  if (match.home_score === null || match.away_score === null) {
    return "";
  }

  const display = resolveDisplayScore(match);
  let score = formatMatchScore(display.home, display.away);

  if (hasPenaltyShootout(match)) {
    score += ` (${formatMatchScore(match.home_penalties!, match.away_penalties!)})`;
  }

  return score;
}

function formatWinner(match: Match): string {
  if (!match.winner) {
    if (match.status !== "finished") return "";
    if (match.home_score === null || match.away_score === null) return "";
    if (match.home_score > match.away_score) return match.home_team_name;
    if (match.home_score < match.away_score) return match.away_team_name;
    return "Draw";
  }

  if (match.winner === "draw") return "Draw";
  if (match.winner === "home") return match.home_team_name;
  return match.away_team_name;
}

function resolveEntryPoints(
  entry: MatchPredictionEntry,
  match: Match,
): number | null {
  if (match.home_score === null || match.away_score === null) {
    return null;
  }

  const scoringMatch = {
    round_key: match.round_key,
    home_score: match.home_score,
    away_score: match.away_score,
    winner: match.winner,
  };

  if (match.status === "finished") {
    return (
      entry.points_awarded ?? scorePrediction(entry.outcome, scoringMatch)
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

function formatPick(
  entry: MatchPredictionEntry,
  match: Match,
): string {
  return formatOutcomeWins(
    entry.outcome,
    match.home_team_name,
    match.away_team_name,
    undefined,
    { knockout: isKnockoutRound(match.round_key) },
  );
}

function formatOutcomeTickerLabel(
  outcome: MatchPredictionEntry["outcome"],
  match: Match,
): string {
  if (outcome === "home") return getTeamTicker(match.home_team_name);
  if (outcome === "away") return getTeamTicker(match.away_team_name);
  return "Ничья";
}

function addMatrixSheet(workbook: ExcelJS.Workbook, data: ResultsData): void {
  const sheet = workbook.addWorksheet("Матрица");
  const players = data.overall;
  const revealableSet = new Set(data.revealableMatchIds);

  sheet.columns = [
    { header: "Матч", key: "match", width: 40 },
    ...players.map((player, index) => ({
      header: player.display_name,
      key: `p${index}`,
      width: 14,
    })),
  ];
  sheet.getRow(1).font = { bold: true };

  const totalsRow = sheet.addRow([
    "Итого (очки)",
    ...players.map((player) => player.total_points),
  ]);
  totalsRow.font = { bold: true };

  sheet.addRow([
    "Δ голов (тай-брейк)",
    ...players.map((player) => player.tiebreaker_overall ?? ""),
  ]);

  for (const stage of data.stages) {
    const stageMatches = (data.matchesByStage[stage] ?? []).filter((match) =>
      revealableSet.has(match.id),
    );
    if (stageMatches.length === 0) continue;

    const stageRow = sheet.addRow([formatStage(stage)]);
    stageRow.font = { bold: true };

    for (const match of stageMatches) {
      const entries = data.predictionsByMatch[match.id] ?? [];
      const entryByUser = new Map(
        entries.map((entry) => [entry.user_id, entry]),
      );

      const score = formatMatchScoreCell(match);
      const label = `${match.home_team_name} — ${match.away_team_name}${score ? ` (${score})` : ""}`;

      sheet.addRow([
        label,
        ...players.map((player) => {
          const entry = entryByUser.get(player.user_id);
          if (!entry) return "";
          const points = resolveEntryPoints(entry, match);
          const pick = formatOutcomeTickerLabel(entry.outcome, match);
          return points === null ? pick : `${pick} (${points > 0 ? `+${points}` : "0"})`;
        }),
      ]);
    }
  }

  const revealedRounds = TIEBREAKER_ROUNDS.filter(
    (round) => data.tiebreaker.revealedRounds[round.key],
  );

  if (revealedRounds.length > 0) {
    const headerRow = sheet.addRow(["Тай-брейк"]);
    headerRow.font = { bold: true };

    const rowByUser = new Map(data.tiebreaker.rows.map((row) => [row.userId, row]));

    for (const round of revealedRounds) {
      const actual = data.tiebreaker.actualGoalsByRound[round.key];

      sheet.addRow([
        `${round.label} (факт: ${actual ?? "—"})`,
        ...players.map((player) => {
          const cell = rowByUser.get(player.user_id)?.perRound[round.key];
          if (!cell) return "";
          return `${cell.prediction ?? "—"} (Δ${cell.deviation})`;
        }),
      ]);
    }
  }

  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
}

export async function buildResultsWorkbook(
  data: ResultsData,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WC 2026 Predictor";
  workbook.created = new Date();

  addMatrixSheet(workbook, data);

  const overallSheet = workbook.addWorksheet("Итоги");
  overallSheet.columns = [
    { header: "Место", key: "rank", width: 8 },
    { header: "Игрок", key: "player", width: 28 },
    { header: "Очки", key: "points", width: 10 },
    { header: "Δ голов", key: "tiebreak", width: 12 },
  ];
  overallSheet.getRow(1).font = { bold: true };

  for (const entry of data.overall) {
    overallSheet.addRow({
      rank: entry.rank,
      player: entry.display_name,
      points: entry.total_points,
      tiebreak: entry.tiebreaker_overall ?? "",
    });
  }

  const matchesSheet = workbook.addWorksheet("Матчи");
  matchesSheet.columns = [
    { header: "Стадия", key: "stage", width: 14 },
    { header: "Дата", key: "date", width: 20 },
    { header: "Дома", key: "home", width: 22 },
    { header: "Гости", key: "away", width: 22 },
    { header: "Счёт", key: "score", width: 14 },
    { header: "Статус", key: "status", width: 12 },
    { header: "Победитель", key: "winner", width: 22 },
  ];
  matchesSheet.getRow(1).font = { bold: true };

  for (const match of data.matches) {
    matchesSheet.addRow({
      stage: formatStage(match.round_key),
      date: new Date(match.kickoff_at).toLocaleString(),
      home: match.home_team_name,
      away: match.away_team_name,
      score: formatMatchScoreCell(match),
      status: formatMatchStatus(match),
      winner: formatWinner(match),
    });
  }

  const votesSheet = workbook.addWorksheet("Голоса");
  votesSheet.columns = [
    { header: "Матч", key: "match", width: 36 },
    { header: "Стадия", key: "stage", width: 14 },
    { header: "Игрок", key: "player", width: 24 },
    { header: "Прогноз", key: "pick", width: 28 },
    { header: "Очки", key: "points", width: 10 },
  ];
  votesSheet.getRow(1).font = { bold: true };

  const revealableSet = new Set(data.revealableMatchIds);

  for (const match of data.matches) {
    if (!revealableSet.has(match.id) && !shouldRevealMatchPredictions(match)) {
      continue;
    }

    const predictions = data.predictionsByMatch[match.id] ?? [];
    const matchLabel = `${match.home_team_name} — ${match.away_team_name}`;

    for (const entry of predictions) {
      const points = resolveEntryPoints(entry, match);
      votesSheet.addRow({
        match: matchLabel,
        stage: formatStage(match.round_key),
        player: entry.display_name,
        pick: formatPick(entry, match),
        points: points ?? 0,
      });
    }
  }

  const tiebreakerSheet = workbook.addWorksheet("Тай-брейкеры");
  tiebreakerSheet.columns = [
    { header: "Тур", key: "round", width: 16 },
    { header: "Игрок", key: "player", width: 24 },
    { header: "Прогноз", key: "prediction", width: 12 },
    { header: "Факт", key: "actual", width: 10 },
    { header: "Откл.", key: "deviation", width: 10 },
  ];
  tiebreakerSheet.getRow(1).font = { bold: true };

  for (const round of TIEBREAKER_ROUNDS) {
    if (!data.tiebreaker.revealedRounds[round.key]) continue;

    const actual = data.tiebreaker.actualGoalsByRound[round.key];

    for (const row of data.tiebreaker.rows) {
      const cell = row.perRound[round.key];
      if (!cell) continue;

      tiebreakerSheet.addRow({
        round: round.label,
        player: row.displayName,
        prediction: cell.prediction ?? "",
        actual: actual ?? "",
        deviation: cell.deviation,
      });
    }
  }

  return workbook;
}

export async function buildResultsExcelBuffer(
  data: ResultsData,
): Promise<Buffer> {
  const workbook = await buildResultsWorkbook(data);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
