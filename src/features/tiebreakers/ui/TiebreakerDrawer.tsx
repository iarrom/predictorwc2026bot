"use client";

import type { TiebreakerRoundState } from "@/entities/tiebreaker/model/types";
import { formatTiebreakerDeadline } from "@/features/tiebreakers/lib/formatDeadline";
import { formatTiebreakerMatchCount } from "@/features/tiebreakers/lib/formatMatchCount";
import { TiebreakerForm } from "@/features/tiebreakers/ui/TiebreakerForm";
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
}

export function TiebreakerDrawer({
  round,
  canEdit,
  onClose,
}: TiebreakerDrawerProps) {
  const open = Boolean(round);

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
              <DrawerTitle>{round.label}</DrawerTitle>
              <DrawerDescription className="space-y-1">
                <span className="block">
                  {formatTiebreakerMatchCount(round.matchCount)}
                </span>
                <span className="block">
                  {round.locked
                    ? "Locked after the first match in this round."
                    : round.deadlineAt
                      ? `Open until ${formatTiebreakerDeadline(round.deadlineAt)}`
                      : "No matches scheduled for this round yet."}
                </span>
              </DrawerDescription>
            </DrawerHeader>

            <TiebreakerForm
              key={round.roundKey}
              round={round}
              canEdit={canEdit}
              onSaved={onClose}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
