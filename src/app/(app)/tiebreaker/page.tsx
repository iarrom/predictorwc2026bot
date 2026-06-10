import { getTiebreakerPageData } from "@/features/tiebreakers/queries";
import { TiebreakerView } from "@/features/tiebreakers/ui/TiebreakerView";

export default async function TiebreakerPage() {
  const { rounds, canEdit, standings, showPlayerNames, currentUserId } =
    await getTiebreakerPageData();

  return (
    <TiebreakerView
      rounds={rounds}
      canEdit={canEdit}
      standings={standings}
      showPlayerNames={showPlayerNames}
      currentUserId={currentUserId}
    />
  );
}
