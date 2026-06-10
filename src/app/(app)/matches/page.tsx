import type { Match, MatchEvent } from "@/entities/match/model/types";
import { buildPredictionsByMatch } from "@/features/matches/lib/predictionsByMatch";
import { buildTeamColorsMap } from "@/features/matches/lib/teamColors";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import {
  decryptPredictionForDisplay,
  shouldRevealOutcome,
} from "@/features/predictions/lib/decryptForDisplay";
import { MatchesView } from "@/features/matches/ui/MatchesView";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId, isParticipant } from "@/shared/lib/auth";
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

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const kickoffByMatchId = Object.fromEntries(
    (matches ?? []).map((match) => [match.id, match.kickoff_at]),
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
          .select("match_id, round_key, outcome_encrypted")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("predictions")
      .select("match_id, user_id, outcome_encrypted, points_awarded"),
    supabase.from("profiles").select("id, display_name, photo_url"),
    supabase.from("teams").select("name, primary_color"),
    supabase
      .from("match_events")
      .select("*")
      .order("minute", { ascending: true }),
  ]);

  const predictionMap = Object.fromEntries(
    (predictions ?? []).map((p) => [
      p.match_id,
      {
        round_key: p.round_key,
        outcome: decryptPredictionForDisplay(
          p.outcome_encrypted,
          userId!,
          p.match_id,
        ),
      },
    ]),
  );

  const voterMap = Object.fromEntries(
    buildVoterMap(allPredictions ?? [], profiles ?? []),
  );

  const revealedPredictions = (allPredictions ?? [])
    .filter((prediction) =>
      shouldRevealOutcome(
        prediction.user_id,
        userId,
        kickoffByMatchId[prediction.match_id],
      ),
    )
    .map((prediction) => ({
      match_id: prediction.match_id,
      user_id: prediction.user_id,
      points_awarded: prediction.points_awarded,
      outcome: decryptPredictionForDisplay(
        prediction.outcome_encrypted,
        prediction.user_id,
        prediction.match_id,
      ),
    }));

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
      matches={matches as Match[]}
      voterMap={voterMap}
      predictionMap={predictionMap}
      predictionsByMatch={predictionsByMatch}
      eventsByMatch={eventsByMatch}
      currentUserId={userId}
      teamColors={teamColors}
      canPredict={canPredict}
    />
  );
}
