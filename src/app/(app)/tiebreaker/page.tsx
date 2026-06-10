import { getTiebreakerPageData } from "@/features/tiebreakers/queries";
import { TiebreakerView } from "@/features/tiebreakers/ui/TiebreakerView";

export default async function TiebreakerPage() {
  const { rounds, canEdit } = await getTiebreakerPageData();

  return <TiebreakerView rounds={rounds} canEdit={canEdit} />;
}
