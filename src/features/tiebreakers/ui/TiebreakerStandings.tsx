"use client";

import { useTranslations } from "next-intl";
import {
  TIEBREAKER_ROUND_KEYS,
  type TiebreakerRoundKey,
} from "@/entities/tiebreaker/model/types";
import type { TiebreakerStandingsResult } from "@/entities/tiebreaker/lib/standings";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROUND_COLUMN_LABELS: Record<TiebreakerRoundKey, string> = {
  group_1: "1",
  group_2: "2",
  group_3: "3",
  playoff: "PO",
};

interface TiebreakerStandingsProps {
  standings: TiebreakerStandingsResult;
  showPlayerNames: boolean;
  currentUserId: string | null;
}

function formatCellValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return String(value);
}

export function TiebreakerStandings({
  standings,
  showPlayerNames,
  currentUserId,
}: TiebreakerStandingsProps) {
  const t = useTranslations("tiebreaker.standings");
  const tCommon = useTranslations("common");

  const isPreview = !TIEBREAKER_ROUND_KEYS.some(
    (roundKey) => standings.revealedRounds[roundKey],
  );

  return (
    <div className="mt-3 sports-panel corner-squircle flex flex-col">
      <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {isPreview ? t("previewDescription") : t("description")}
        </p>
      </div>

      <div className="overflow-x-auto overscroll-contain">
        {isPreview ? (
          <table className="w-full min-w-[20rem] border-collapse text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="sticky left-0 z-10 bg-[var(--sports-panel-bg)] px-3 py-2 text-left font-medium">
                  {t("name")}
                </th>
                {TIEBREAKER_ROUND_KEYS.map((roundKey) => (
                  <th
                    key={roundKey}
                    className="px-2 py-2 text-right font-medium tabular-nums"
                  >
                    {ROUND_COLUMN_LABELS[roundKey]}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium tabular-nums">
                  {t("overall")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/[0.08] text-muted-foreground/60">
                <td className="sticky left-0 z-10 bg-[var(--sports-panel-bg)] px-3 py-2 font-medium">
                  {t("real")}
                </td>
                {TIEBREAKER_ROUND_KEYS.map((roundKey) => (
                  <td
                    key={roundKey}
                    className="px-2 py-2 text-right tabular-nums"
                  >
                    —
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">—</td>
              </tr>
            </tbody>
          </table>
        ) : standings.rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <table className="w-full min-w-[20rem] border-collapse text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="sticky left-0 z-10 bg-[var(--sports-panel-bg)] px-3 py-2 text-left font-medium">
                  {t("name")}
                </th>
                {TIEBREAKER_ROUND_KEYS.map((roundKey) => (
                  <th
                    key={roundKey}
                    className="px-2 py-2 text-right font-medium tabular-nums"
                  >
                    {ROUND_COLUMN_LABELS[roundKey]}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium tabular-nums">
                  {t("overall")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/[0.08] text-muted-foreground">
                <td className="sticky left-0 z-10 bg-[var(--sports-panel-bg)] px-3 py-2 font-medium">
                  {t("real")}
                </td>
                {TIEBREAKER_ROUND_KEYS.map((roundKey) => (
                  <td
                    key={roundKey}
                    className="px-2 py-2 text-right tabular-nums"
                  >
                    {formatCellValue(standings.actualGoalsByRound[roundKey])}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">—</td>
              </tr>

              {standings.rows.map((row, index) => {
                const isCurrentUser = row.userId === currentUserId;
                const displayName = showPlayerNames
                  ? row.displayName
                  : t("playerRank", { rank: index + 1 });

                return (
                  <tr
                    key={row.userId}
                    className={cn(
                      "border-t border-white/[0.08]",
                      isCurrentUser && "bg-white/[0.03]",
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-[var(--sports-panel-bg)] px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {showPlayerNames && (
                          <Avatar className="size-6 shrink-0">
                            {row.photoUrl && (
                              <AvatarImage
                                src={row.photoUrl}
                                alt={row.displayName}
                              />
                            )}
                            <AvatarFallback className="text-[9px]">
                              {getInitials(row.displayName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <p className="truncate text-[12px] font-medium leading-tight text-foreground">
                          {displayName}
                        </p>
                        {showPlayerNames && isCurrentUser && (
                          <Badge
                            variant="secondary"
                            className="h-4 shrink-0 rounded-md px-1.5 text-[10px]"
                          >
                            {tCommon("you")}
                          </Badge>
                        )}
                      </div>
                    </td>
                    {TIEBREAKER_ROUND_KEYS.map((roundKey) => (
                      <td
                        key={roundKey}
                        className="px-2 py-2 text-right text-[12px] tabular-nums text-foreground"
                      >
                        {formatCellValue(row.perRound[roundKey]?.deviation)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-[13px] font-semibold tabular-nums text-foreground">
                      {formatCellValue(row.overall)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isPreview && (
        <p className="border-t border-white/[0.08] px-4 py-3 text-center text-[11px] text-muted-foreground">
          {t("previewHint")}
        </p>
      )}
    </div>
  );
}
