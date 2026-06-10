import type { OutcomeMessages } from "@/entities/prediction/lib/formatOutcome";

type OutcomeTranslator = (
  key: "draw" | "homeWins" | "awayWins" | "drawShort" | "homeShort" | "awayShort",
  values?: { team?: string },
) => string;

export function createOutcomeMessages(t: OutcomeTranslator): OutcomeMessages {
  return {
    draw: t("draw"),
    homeWins: (team) => t("homeWins", { team }),
    awayWins: (team) => t("awayWins", { team }),
    drawShort: t("drawShort"),
    homeShort: (team) => t("homeShort", { team }),
    awayShort: (team) => t("awayShort", { team }),
  };
}
