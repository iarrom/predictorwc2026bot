"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { buildGroupStandings } from "@/entities/match/lib/standings";
import type { Match } from "@/entities/match/model/types";
import { loadBracketData } from "@/features/brackets/actions";
import { useBracketOverlay } from "@/features/brackets/model/BracketOverlayContext";
import { BracketConnectorGutter } from "@/features/brackets/ui/BracketConnectorGutter";
import { BracketKnockoutColumn } from "@/features/brackets/ui/BracketKnockoutColumn";
import {
  BracketStageNavigator,
  useBracketScrollSync,
} from "@/features/brackets/ui/BracketStageNavigator";
import type { MatchesBundle } from "@/features/matches/lib/loadMatchesBundle";
import { buildPreviousMatchesByMatch } from "@/features/matches/lib/previousMatches";
import { MatchDrawer } from "@/features/matches/ui/MatchDrawer";
import {
  buildMatchesByNumber,
  type KnockoutBracketStageKey,
} from "@/shared/lib/playoff/bracket";
import {
  BRACKET_COLUMN_WIDTH_CLASS,
  KNOCKOUT_STAGE_ORDER,
} from "@/shared/lib/playoff/bracketLayout";
import { createClient } from "@/shared/lib/supabase/client";
import { cn } from "@/lib/utils";

const LIVE_REFRESH_DEBOUNCE_MS = 10_000;

const COLUMN_SNAP_CLASS = cn(
  BRACKET_COLUMN_WIDTH_CLASS,
  "shrink-0 snap-start snap-always",
);

export function BracketOverlay() {
  const t = useTranslations("brackets");
  const { open, closeBracket: closeBracketOverlay } = useBracketOverlay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<
    Record<KnockoutBracketStageKey, HTMLDivElement | null>
  >({
    round_of_32: null,
    round_of_16: null,
    quarter_final: null,
    semi_final: null,
    final: null,
  });

  const [bundle, setBundle] = useState<MatchesBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { activeStage, scrollToStage } = useBracketScrollSync(
    scrollRef,
    columnRefs,
    open && !loading && !loadError,
  );

  useEffect(() => {
    if (!open || bundle) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lazy-load bundle on first open
    setLoading(true);
    setLoadError(false);

    loadBracketData()
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setMatches(data.matches);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, bundle]);

  const handleCloseOverlay = useCallback(() => {
    setSelectedMatchId(null);
    closeBracketOverlay();
  }, [closeBracketOverlay]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  useEffect(() => {
    if (!open || !bundle) return;

    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void loadBracketData()
          .then((data) => {
            setBundle(data);
            setMatches(data.matches);
          })
          .catch(() => {
            /* keep stale data on background refresh failure */
          });
      }, LIVE_REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("brackets-overlay-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, [open, bundle]);

  const groupStandings = useMemo(() => buildGroupStandings(matches), [matches]);
  const groupStandingsByName = useMemo(
    () => Object.fromEntries(groupStandings.map((group) => [group.groupName, group])),
    [groupStandings],
  );
  const previousMatchesByMatch = useMemo(
    () => buildPreviousMatchesByMatch(matches),
    [matches],
  );
  const matchesByNumber = useMemo(
    () => buildMatchesByNumber(matches),
    [matches],
  );

  const drawerMatchId = useMemo(() => {
    if (!selectedMatchId) return null;
    return matches.some((match) => match.id === selectedMatchId)
      ? selectedMatchId
      : null;
  }, [matches, selectedMatchId]);

  const setColumnRef = useCallback(
    (stage: KnockoutBracketStageKey) => (node: HTMLDivElement | null) => {
      columnRefs.current[stage] = node;
    },
    [],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#0a1658_0%,#060e38_100%)] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <header className="shrink-0 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div className="relative flex min-h-9 items-center justify-center">
          <h1 className="text-[15px] font-semibold tracking-wide text-white">
            {t("title")}
          </h1>
          <button
            type="button"
            onClick={handleCloseOverlay}
            className="absolute top-1/2 right-0 flex size-9 shrink-0 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-[transform,background-color] duration-200 hover:bg-white/15 active:scale-95 motion-reduce:transition-none"
            aria-label={t("close")}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </button>
        </div>
      </header>

      <BracketStageNavigator
        activeStage={activeStage}
        onStageChange={scrollToStage}
      />

      <div
        ref={scrollRef}
        className="min-h-0 w-full flex-1 snap-x snap-mandatory overflow-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom,0px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading && (
          <div className="flex h-full items-center justify-center px-6 text-sm text-white/60">
            {t("loading")}
          </div>
        )}

        {loadError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-300">
            {t("loadError")}
          </div>
        )}

        {!loading && !loadError && (
          <div className="flex items-start pl-3 pb-4">
            {KNOCKOUT_STAGE_ORDER.map((stage, index) => (
              <div key={stage} className="flex shrink-0 items-start">
                {index > 0 && (
                  <BracketConnectorGutter
                    toStage={
                      stage as Exclude<
                        KnockoutBracketStageKey,
                        "round_of_32"
                      >
                    }
                  />
                )}
                <div
                  ref={setColumnRef(stage)}
                  data-stage={stage}
                  className={cn(COLUMN_SNAP_CLASS, "px-0.5")}
                >
                  <BracketKnockoutColumn
                    stage={stage}
                    matchesByNumber={matchesByNumber}
                    onSelectMatch={setSelectedMatchId}
                  />
                </div>
              </div>
            ))}

            <div className="w-3 shrink-0" aria-hidden />
          </div>
        )}
      </div>

      {bundle && (
        <MatchDrawer
          matches={matches}
          matchId={drawerMatchId}
          voterMap={bundle.voterMap}
          predictionMap={bundle.predictionMap}
          predictionsByMatch={bundle.predictionsByMatch}
          eventsByMatch={bundle.eventsByMatch}
          currentUserId={bundle.currentUserId}
          teamColors={bundle.teamColors}
          playerPhotosByTeam={bundle.playerPhotosByTeam}
          canPredict={bundle.canPredict}
          canSeePlayerNames={bundle.canSeePlayerNames}
          groupStandingsByName={groupStandingsByName}
          previousMatchesByMatch={previousMatchesByMatch}
          upsetMatchIds={bundle.upsetMatchIds}
          onMatchChange={setSelectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </div>
  );
}
