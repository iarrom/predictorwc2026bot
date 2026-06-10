import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Match } from "@/entities/match/model/types";
import type { PendingParticipant } from "@/features/admin/lib/pendingPicks";
import { PingAllButton } from "@/features/admin/ui/PingAllButton";
import { PingUserButton } from "@/features/admin/ui/PingUserButton";
import { toIntlLocale } from "@/i18n/config";
import type { Locale } from "@/shared/types/database";

interface PendingPicksCardProps {
  nextMatch: Match | null;
  pending: PendingParticipant[];
  locale: Locale;
}

export async function PendingPicksCard({
  nextMatch,
  pending,
  locale,
}: PendingPicksCardProps) {
  const t = await getTranslations("admin.picks");

  if (!nextMatch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
        </CardContent>
      </Card>
    );
  }

  const kickoffFormatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-foreground/10 bg-muted/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("nextMatch")}
          </p>
          <p className="mt-1 text-base font-semibold">
            {nextMatch.home_team_name} vs {nextMatch.away_team_name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {kickoffFormatter.format(new Date(nextMatch.kickoff_at))}
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">
            {t("pendingTitle", { count: pending.length })}
          </p>
          {!pending.length ? (
            <p className="text-sm text-muted-foreground">{t("allDone")}</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {pending.map((participant) => (
                <li
                  key={participant.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate font-medium">
                    {participant.display_name}
                  </span>
                  <PingUserButton
                    userId={participant.id}
                    matchId={nextMatch.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {pending.length > 0 && (
          <PingAllButton matchId={nextMatch.id} pendingCount={pending.length} />
        )}
      </CardContent>
    </Card>
  );
}
