import type { Match, MatchEvent } from "@/entities/match/model/types";
import { buildPredictionsByMatch } from "@/features/matches/lib/predictionsByMatch";
import { shouldRevealMatchPredictions } from "@/features/matches/lib/shouldRevealMatchPredictions";
import { buildTeamColorsMap } from "@/features/matches/lib/teamColors";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import { decryptPredictionForDisplay } from "@/features/predictions/lib/decryptForDisplay";
import { MatchesView } from "@/features/matches/ui/MatchesView";
import {
  canSeePlayerNames,
  getCurrentUserId,
  isParticipant,
} from "@/shared/lib/auth";
import { decryptPredictionRows } from "@/shared/lib/predictions-crypto";
import { createClient } from "@/shared/lib/supabase/server";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function MatchesPage() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();
  const canPredict = await isParticipant();
  const showPlayerNames = await canSeePlayerNames();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const typedMatches = (matches ?? []) as Match[];
  const revealableMatchIds = new Set(
    typedMatches
      .filter((match) => shouldRevealMatchPredictions(match))
      .map((match) => match.id),
  );

  const [
    { data: predictions },
    { data: allPredictions },
    { data: profiles },
    { data: teams },
    { data: matchEvents },
  ] = await Promise.all([
    userId
      ? supabase
          .from("predictions")
          .select("match_id, round_key, outcome_encrypted, points_awarded")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("predictions")
      .select("match_id, user_id, outcome_encrypted, points_awarded"),
    revealableMatchIds.size > 0
      ? supabase.from("profiles").select("id, display_name, photo_url")
      : Promise.resolve({ data: [] }),
    supabase.from("teams").select("name, primary_color"),
    supabase
      .from("match_events")
      .select("*")
      .order("minute", { ascending: true }),
  ]);

  const predictionMap = Object.fromEntries(
    (predictions ?? []).flatMap((p) => {
      const outcome = decryptPredictionForDisplay(
        p.outcome_encrypted,
        userId!,
        p.match_id,
      );

      if (!outcome) {
        return [];
      }

      return [
        [
          p.match_id,
          {
            round_key: p.round_key,
            outcome,
            points_awarded: p.points_awarded,
          },
        ],
      ];
    }),
  );

  const voterMap = Object.fromEntries(
    buildVoterMap(
      (allPredictions ?? []).map((prediction) => ({
        match_id: prediction.match_id,
      })),
    ),
  );

  const revealablePredictions = (allPredictions ?? []).filter((prediction) =>
    revealableMatchIds.has(prediction.match_id),
  );

  const decryptedRows = decryptPredictionRows(
    revealablePredictions.map((prediction) => ({
      user_id: prediction.user_id,
      match_id: prediction.match_id,
      outcome_encrypted: prediction.outcome_encrypted,
    })),
  );

  const revealedPredictions = decryptedRows.map((row) => {
    const source = revealablePredictions.find(
      (prediction) =>
        prediction.user_id === row.user_id &&
        prediction.match_id === row.match_id,
    );

    return {
      match_id: row.match_id,
      user_id: row.user_id,
      outcome: row.outcome,
      points_awarded: source?.points_awarded ?? null,
    };
  });

  const predictionsByMatch = buildPredictionsByMatch(
    revealedPredictions,
    profiles ?? [],
  );

  const teamColors = buildTeamColorsMap(teams ?? []);

  const eventsByMatch = (matchEvents ?? []).reduce<
    Record<string, MatchEvent[]>
  >((acc, event) => {
    const list = acc[event.match_id] ?? [];
    list.push(event as MatchEvent);
    acc[event.match_id] = list;
    return acc;
  }, {});

  if (!matches || matches.length === 0) {
    return (
      <Empty className="glass corner-squircle mt-4 rounded-3xl border-0">
        <EmptyHeader>
          <EmptyTitle>No matches loaded yet</EmptyTitle>
          <EmptyDescription>
            An admin should run{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
              pnpm import:schedule
            </code>
            .
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <MatchesView
      matches={typedMatches}
      voterMap={voterMap}
      predictionMap={predictionMap}
      predictionsByMatch={predictionsByMatch}
      eventsByMatch={eventsByMatch}
      currentUserId={userId}
      teamColors={teamColors}
      canPredict={canPredict}
      canSeePlayerNames={showPlayerNames}
    />
  );
}
