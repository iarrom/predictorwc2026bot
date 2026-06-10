"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { TiebreakerRoundState } from "@/entities/tiebreaker/model/types";
import { formatTiebreakerDeadline } from "@/features/tiebreakers/lib/formatDeadline";
import { formatTiebreakerMatchCount } from "@/features/tiebreakers/lib/formatMatchCount";
import { TiebreakerForm } from "@/features/tiebreakers/ui/TiebreakerForm";
import type { Locale } from "@/shared/types/database";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface TiebreakerDrawerProps {
  round: TiebreakerRoundState | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function TiebreakerDrawer({
  round,
  canEdit,
  onClose,
  onSaved,
}: TiebreakerDrawerProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("tiebreaker");
  const open = Boolean(round);

  const matchCountMessages = useMemo(
    () => ({
      none: t("matchCount.none"),
      one: (count: number) => t("matchCount.one", { count }),
      other: (count: number) => t("matchCount.other", { count }),
    }),
    [t],
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      modal
      shouldScaleBackground={false}
    >
      <DrawerContent className="corner-squircle max-h-[85dvh]">
        {round && (
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-2">
            <DrawerHeader className="px-0 pb-4 pt-0 text-left">
              <DrawerTitle>{t(`rounds.${round.roundKey}`)}</DrawerTitle>
              <DrawerDescription className="space-y-1">
                <span className="block">
                  {formatTiebreakerMatchCount(
                    round.matchCount,
                    matchCountMessages,
                  )}
                </span>
                <span className="block">
                  {round.locked
                    ? t("drawerLocked")
                    : round.deadlineAt
                      ? t("drawerOpenUntil", {
                          deadline: formatTiebreakerDeadline(
                            round.deadlineAt,
                            locale,
                          ),
                        })
                      : t("drawerNoMatches")}
                </span>
              </DrawerDescription>
            </DrawerHeader>

            <TiebreakerForm
              key={round.roundKey}
              round={round}
              canEdit={canEdit}
              onSaved={onSaved ?? onClose}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
