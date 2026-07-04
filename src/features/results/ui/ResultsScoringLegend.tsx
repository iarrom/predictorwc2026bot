"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function ResultsScoringLegend() {
  const t = useTranslations("results.pointsPerRound");

  const items = [
    { key: "group", label: t("group") },
    { key: "roundOf32", label: t("roundOf32") },
    { key: "roundOf16", label: t("roundOf16") },
    { key: "quarterFinal", label: t("quarterFinal") },
    { key: "semiFinal", label: t("semiFinal") },
    { key: "final", label: t("final") },
    { key: "thirdPlace", label: t("thirdPlace") },
  ] as const;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item.key} variant="secondary">
          {item.label}
        </Badge>
      ))}
    </div>
  );
}
