import { getTranslations } from "next-intl/server";
import { LeaderboardLiveRefresh } from "@/features/leaderboard/ui/LeaderboardLiveRefresh";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { canSeePlayerNames } from "@/shared/lib/auth";
import { LEADERBOARD_EXCLUDED_TELEGRAM_IDS } from "@/shared/lib/leaderboard";
import { createClient } from "@/shared/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function RankCell({
  rank,
  labels,
}: {
  rank: number;
  labels: Record<number, { emoji: string; label: string }>;
}) {
  const medal = labels[rank];

  if (medal) {
    return (
      <span className="flex size-6 items-center justify-center text-base leading-none">
        <span role="img" aria-label={medal.label}>
          {medal.emoji}
        </span>
      </span>
    );
  }

  return (
    <span className="flex size-6 items-center justify-center text-[12px] tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard");
  const supabase = await createClient();
  const showNames = await canSeePlayerNames();

  const rankLabels: Record<number, { emoji: string; label: string }> = {
    1: { emoji: "🥇", label: t("rank1") },
    2: { emoji: "🥈", label: t("rank2") },
    3: { emoji: "🥉", label: t("rank3") },
  };

  const { data: leaderboard } = await supabase
    .from("leaderboard_base")
    .select("user_id, display_name, predictions_count, total_points")
    .order("total_points", { ascending: false })
    .order("predictions_count", { ascending: false });

  const { data: excludedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .in("telegram_id", [...LEADERBOARD_EXCLUDED_TELEGRAM_IDS]);

  const excludedUserIds = new Set(
    (excludedProfiles ?? []).map((profile) => profile.id),
  );

  const photoMap = new Map<string, string | null>();

  if (showNames) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, photo_url");

    for (const p of profiles ?? []) {
      photoMap.set(p.id, p.photo_url);
    }
  }

  const entries = (leaderboard ?? [])
    .filter((entry) => !excludedUserIds.has(entry.user_id))
    .map((entry) => ({
      ...entry,
      photo_url: photoMap.get(entry.user_id) ?? null,
    }));

  return (
    <LeaderboardLiveRefresh>
    <div className="flex flex-col animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
      <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <h1 className="text-[15px] font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("noPlayers")}
            </p>
          ) : showNames ? (
            <>
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                <span className="text-center">#</span>
                <span>{t("player")}</span>
                <span className="text-right">{t("points")}</span>
                <span className="text-right">{t("picks")}</span>
              </div>

              {entries.map((entry, index) => {
                const rank = index + 1;

                return (
                  <div
                    key={entry.user_id}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
                  >
                    <RankCell rank={rank} labels={rankLabels} />
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar size="sm" className="shrink-0">
                        {entry.photo_url && (
                          <AvatarImage
                            src={entry.photo_url}
                            alt={entry.display_name}
                          />
                        )}
                        <AvatarFallback className="text-[10px]">
                          {getInitials(entry.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate text-[13px] font-medium leading-tight">
                        {entry.display_name}
                      </p>
                    </div>
                    <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                      {entry.total_points}
                    </p>
                    <p className="text-right text-[12px] tabular-nums text-muted-foreground">
                      {entry.predictions_count}
                    </p>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[2rem_1fr] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                <span className="text-center">#</span>
                <span className="text-right">{t("points")}</span>
              </div>

              {entries.map((entry, index) => {
                const rank = index + 1;

                return (
                  <div
                    key={entry.user_id}
                    className="grid grid-cols-[2rem_1fr] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
                  >
                    <RankCell rank={rank} labels={rankLabels} />
                    <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
                      {entry.total_points}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
    </LeaderboardLiveRefresh>
  );
}
