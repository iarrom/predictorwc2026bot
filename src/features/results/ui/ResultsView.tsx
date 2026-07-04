"use client";

import { useTranslations } from "next-intl";
import type { ResultsData } from "@/features/results/lib/loadResultsData";
import { ResultsMatrix } from "@/features/results/ui/ResultsMatrix";
import { ResultsScoringLegend } from "@/features/results/ui/ResultsScoringLegend";
import { Button } from "@/components/ui/button";

interface ResultsViewProps {
  data: ResultsData;
}

export function ResultsView({ data }: ResultsViewProps) {
  const t = useTranslations("results");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">{t("scoringLegend")}</p>
            <ResultsScoringLegend />
          </div>
        </div>
        <Button asChild variant="outline">
          <a href="/results/export">{t("downloadExcel")}</a>
        </Button>
      </div>

      <ResultsMatrix data={data} />
    </div>
  );
}
