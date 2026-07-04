import { ResultsView } from "@/features/results/ui/ResultsView";
import { loadResultsData } from "@/features/results/lib/loadResultsData";

export const revalidate = 60;

export default async function ResultsPage() {
  const data = await loadResultsData();

  return <ResultsView data={data} />;
}
