import { loadMatchesBundle } from "@/features/matches/lib/loadMatchesBundle";
import { MatchesView } from "@/features/matches/ui/MatchesView";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function MatchesPage() {
  const bundle = await loadMatchesBundle();

  if (bundle.matches.length === 0) {
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
      matches={bundle.matches}
      voterMap={bundle.voterMap}
      predictionMap={bundle.predictionMap}
      predictionsByMatch={bundle.predictionsByMatch}
      eventsByMatch={bundle.eventsByMatch}
      currentUserId={bundle.currentUserId}
      teamColors={bundle.teamColors}
      playerPhotosByTeam={bundle.playerPhotosByTeam}
      canPredict={bundle.canPredict}
      canSeePlayerNames={bundle.canSeePlayerNames}
      upsetMatchIds={bundle.upsetMatchIds}
    />
  );
}
