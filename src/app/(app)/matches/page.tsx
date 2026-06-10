import { Suspense } from "react";
import type { Match } from "@/entities/match/model/types";
import { buildPredictionsByMatch } from "@/features/matches/lib/predictionsByMatch";
import { buildTeamColorsMap } from "@/features/matches/lib/teamColors";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
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

  const [
    { data: predictions },
    { data: allPredictions },
    { data: profiles },
    { data: teams },
  ] = await Promise.all([
    userId
      ? supabase
          .from("predictions")
          .select("match_id, round_key, outcome")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("predictions")
      .select("match_id, user_id, outcome, points_awarded"),
    supabase.from("profiles").select("id, display_name, photo_url"),
    supabase.from("teams").select("name, primary_color"),
  ]);

  const predictionMap = Object.fromEntries(
    (predictions ?? []).map((p) => [
      p.match_id,
      {
        round_key: p.round_key,
        outcome: p.outcome,
      },
    ]),
  );

  const voterMap = Object.fromEntries(
    buildVoterMap(allPredictions ?? [], profiles ?? []),
  );

  const predictionsByMatch = buildPredictionsByMatch(
    allPredictions ?? [],
    profiles ?? [],
  );

  const teamColors = buildTeamColorsMap(teams ?? []);

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
    <Suspense>
      <MatchesView
        matches={matches as Match[]}
        voterMap={voterMap}
        predictionMap={predictionMap}
        predictionsByMatch={predictionsByMatch}
        currentUserId={userId}
        teamColors={teamColors}
        canPredict={canPredict}
      />
    </Suspense>
  );
}
