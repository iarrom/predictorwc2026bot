"use client";

import { useTranslations } from "next-intl";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon } from "@hugeicons/core-free-icons";
import { useBracketOverlay } from "@/features/brackets/model/BracketOverlayContext";
import { cn } from "@/lib/utils";

export function BracketNavTrigger() {
  const t = useTranslations("nav");
  const { open, openBracket } = useBracketOverlay();

  if (open) return null;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 px-4 pb-2.5"
      aria-label={t("brackets")}
    >
      <button
        type="button"
        onClick={openBracket}
        className={cn(
          "glass corner-squircle pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-[13px] font-semibold text-white/90 shadow-lg transition-[transform,background-color] duration-200 hover:text-white active:scale-[0.98] motion-reduce:transition-none",
        )}
      >
        <HugeiconsIcon icon={GridViewIcon} className="size-5 shrink-0" />
        <span>{t("brackets")}</span>
      </button>
    </nav>
  );
}
