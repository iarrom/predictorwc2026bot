"use client";

import { useLiveRefresh } from "@/shared/lib/supabase/useLiveRefresh";

export function LeaderboardLiveRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  useLiveRefresh("leaderboard-live", "predictions");

  return children;
}
