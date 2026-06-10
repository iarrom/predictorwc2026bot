"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match } from "@/entities/match/model/types";
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

const PRELOAD_RADIUS = 2;

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
  currentUserId: string | null;
  teamColors: Record<string, string>;
  canPredict: boolean;
  onMatchChange: (matchId: string) => void;
  onClose: () => void;
}

export function MatchDrawer({
  matches,
  matchId,
  voterMap,
  predictionMap,
  predictionsByMatch,
  currentUserId,
  teamColors,
  canPredict,
  onMatchChange,
  onClose,
}: MatchDrawerProps) {
  const open = Boolean(matchId);
  const [contentMounted, setContentMounted] = useState(() => Boolean(matchId));
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

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
    }
  }, [open]);

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
    >
      <DrawerContent className="corner-squircle max-h-[92dvh] border-0 bg-transparent p-0 shadow-none before:hidden">
        <DrawerTitle className="sr-only">Match details</DrawerTitle>

        {contentMounted ? (
          <div className="corner-squircle flex flex-col pt-8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <Carousel
              setApi={setCarouselApi}
              opts={{
                startIndex: activeIndex,
                align: "center",
                containScroll: false,
                loop: false,
                duration: 20,
              }}
              className="w-full"
            >
              <CarouselContent className="ml-0 items-stretch" data-vaul-no-drag>
                {matches.map((match, index) => (
                  <CarouselItem
                    key={match.id}
                    className="flex basis-[90%] px-0.5"
                  >
                    <MatchDrawerSlide
                      match={match}
                      voters={voterMap[match.id] ?? { count: 0, voters: [] }}
                      prediction={predictionMap[match.id]}
                      matchPredictions={predictionsByMatch[match.id] ?? []}
                      currentUserId={currentUserId}
                      teamColors={teamColors}
                      canPredict={canPredict}
                      isActive={index === snapIndex}
                      isMounted={mountedIndices.has(index)}
                      distanceFromActive={Math.abs(index - snapIndex)}
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
