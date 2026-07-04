import { buildResultsExcelBuffer } from "@/features/results/lib/buildResultsWorkbook";
import { loadResultsData } from "@/features/results/lib/loadResultsData";

export const revalidate = 60;

export async function GET() {
  const data = await loadResultsData();
  const buffer = await buildResultsExcelBuffer(data);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="wc2026-results.xlsx"',
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
