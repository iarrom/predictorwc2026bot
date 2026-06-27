"use client";

import type { ReactNode } from "react";
import { BracketOverlayProvider } from "@/features/brackets/model/BracketOverlayContext";
import { BracketNavTrigger } from "@/features/brackets/ui/BracketNavTrigger";
import { BracketOverlay } from "@/features/brackets/ui/BracketOverlay";

export function BracketAppShell({ children }: { children: ReactNode }) {
  return (
    <BracketOverlayProvider>
      {children}
      <BracketNavTrigger />
      <BracketOverlay />
    </BracketOverlayProvider>
  );
}
