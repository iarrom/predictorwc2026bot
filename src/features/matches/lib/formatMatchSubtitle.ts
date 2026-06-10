import type { Match } from "@/entities/match/model/types";
import { getGroupMatchdayFromRoundKey } from "@/entities/match/lib/parseRoundKey";
import type { useTranslations } from "next-intl";

export function formatMatchSubtitle(
  match: Match,
  t: ReturnType<typeof useTranslations<"matches">>,
): string {
  if (match.round_key.startsWith("group_")) {
    const matchday = getGroupMatchdayFromRoundKey(match.round_key);
    if (matchday != null) {
      return t("groupStageMatchday", { number: matchday });
    }

    return t("groupStage");
  }

  if (match.match_number != null) {
    return t("roundMatch", {
      round: match.round_display,
      number: match.match_number,
    });
  }

  return match.round_display;
}
