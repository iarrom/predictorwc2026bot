"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";

type LiveTable = "matches" | "match_events" | "predictions" | "tiebreakers";

const REFRESH_DEBOUNCE_MS = 10_000;

export function useLiveRefresh(
  channelName: string,
  ...tables: LiveTable[]
): void {
  const router = useRouter();
  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(channelName);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingRefresh = false;

    const runRefresh = () => {
      pendingRefresh = false;

      if (document.visibilityState === "hidden") {
        pendingRefresh = true;
        return;
      }

      router.refresh();
    };

    const scheduleRefresh = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        runRefresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && pendingRefresh) {
        runRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
    // tablesKey tracks the subscribed table list.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tables encoded in tablesKey
  }, [channelName, router, tablesKey]);
}
