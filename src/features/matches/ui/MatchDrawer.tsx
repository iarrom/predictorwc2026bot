"use client";

import { useCallback, useEffect, useState } from "react";
import type { GroupStanding } from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { MatchDrawerSlide } from "@/features/matches/ui/MatchDrawerSlide";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const PRELOAD_RADIUS = 2;
// First snap reveals header + prediction + tab bar; second is full-screen scroll.
const COLLAPSED_SNAP = 0.72;
const EXPANDED_SNAP = 1;
const SNAP_POINTS = [COLLAPSED_SNAP, EXPANDED_SNAP] as const;

function expandMountedIndices(
  indices: Set<number>,
  center: number,
  total: number,
  radius: number,
): Set<number> {
  const next = new Set(indices);
  for (let index = center - radius; index <= center + radius; index += 1) {
    if (index >= 0 && index < total) {
      next.add(index);
    }
  }
  return next;
}

interface MatchDrawerProps {
  matches: Match[];
  matchId: string | null;
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  canPredict: boolean;
  groupStandingsByName: Record<string, GroupStanding>;
  onMatchChange: (matchId: string) => void;
  onClose: () => void;
}

export function MatchDrawer({
  matches,
  matchId,
  voterMap,
  predictionMap,
  predictionsByMatch,
  eventsByMatch,
  currentUserId,
  teamColors,
  canPredict,
  groupStandingsByName,
  onMatchChange,
  onClose,
}: MatchDrawerProps) {
  const open = Boolean(matchId);
  const [contentMounted, setContentMounted] = useState(() => Boolean(matchId));
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [snap, setSnap] = useState<number | string>(COLLAPSED_SNAP);
  const expanded = snap === EXPANDED_SNAP;

  const activeIndex = Math.max(
    0,
    matches.findIndex((match) => match.id === matchId),
  );

  const [snapIndex, setSnapIndex] = useState(activeIndex);
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(() =>
    expandMountedIndices(new Set(), activeIndex, matches.length, PRELOAD_RADIUS),
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lazy-mount drawer content after first open
      setContentMounted(true);
      setSnap(COLLAPSED_SNAP);
    }
  }, [open]);

  const handleRequestExpand = useCallback(() => {
    setSnap(EXPANDED_SNAP);
  }, []);

  const handleSnapChange = useCallback((snapPoint: number | string | null) => {
    if (snapPoint != null) {
      setSnap(snapPoint);
    }
  }, []);

  useEffect(() => {
    if (!carouselApi || !matchId) {
      return;
    }

    const index = matches.findIndex((match) => match.id === matchId);
    if (index >= 0 && carouselApi.selectedScrollSnap() !== index) {
      carouselApi.scrollTo(index, true);
    }
  }, [carouselApi, matchId, matches]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const handleSnap = () => {
      const index = carouselApi.selectedScrollSnap();
      setSnapIndex(index);
      setMountedIndices((prev) =>
        expandMountedIndices(prev, index, matches.length, PRELOAD_RADIUS),
      );
    };

    const handleSettle = () => {
      const index = carouselApi.selectedScrollSnap();
      const match = matches[index];

      if (match && match.id !== matchId) {
        onMatchChange(match.id);
      }
    };

    carouselApi.on("select", handleSnap);
    carouselApi.on("settle", handleSettle);
    requestAnimationFrame(handleSnap);

    return () => {
      carouselApi.off("select", handleSnap);
      carouselApi.off("settle", handleSettle);
    };
  }, [carouselApi, matchId, matches, onMatchChange]);

  useEffect(() => {
    if (!carouselApi) {
      return;
    }
    // Slide widths change between carousel (90%) and full-screen (100%) modes.
    carouselApi.reInit();
    carouselApi.scrollTo(carouselApi.selectedScrollSnap(), true);
  }, [carouselApi, expanded]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onClose();
      }
    },
    [onClose],
  );

  if (matches.length === 0) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      modal
      shouldScaleBackground={false}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={handleSnapChange}
    >
      <DrawerContent className="mt-0 h-[100dvh] max-h-[100dvh] border-0 bg-transparent p-0 shadow-none before:hidden data-[vaul-drawer-direction=bottom]:mt-0">
        <DrawerTitle className="sr-only">Match details</DrawerTitle>

        {contentMounted ? (
          <div
            className={cn(
              "flex h-full min-h-0 flex-col",
              expanded ? "pt-0" : "pt-6",
            )}
          >
            <Carousel
              setApi={setCarouselApi}
              opts={{
                startIndex: activeIndex,
                align: "center",
                containScroll: false,
                loop: false,
                duration: 20,
              }}
              className="h-full min-h-0 w-full flex-1"
            >
              <CarouselContent className="ml-0 h-full items-stretch">
                {matches.map((match, index) => (
                  <CarouselItem
                    key={match.id}
                    className={cn(
                      "flex h-full",
                      expanded ? "basis-full px-0" : "basis-[90%] px-1",
                    )}
                  >
                    <MatchDrawerSlide
                      match={match}
                      voters={voterMap[match.id] ?? { count: 0, voters: [] }}
                      prediction={predictionMap[match.id]}
                      matchPredictions={predictionsByMatch[match.id] ?? []}
                      matchEvents={eventsByMatch[match.id] ?? []}
                      currentUserId={currentUserId}
                      teamColors={teamColors}
                      canPredict={canPredict}
                      groupStandingsByName={groupStandingsByName}
                      isActive={index === snapIndex}
                      isMounted={mountedIndices.has(index)}
                      distanceFromActive={Math.abs(index - snapIndex)}
                      expanded={expanded}
                      onRequestExpand={handleRequestExpand}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
