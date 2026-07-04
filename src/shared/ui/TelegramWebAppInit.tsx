"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TelegramWebAppInit() {
  const router = useRouter();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();

    const applyViewport = () => {
      document.documentElement.style.setProperty(
        "--tg-viewport-height",
        `${tg.viewportStableHeight}px`,
      );
    };

    applyViewport();
    tg.onEvent("viewportChanged", applyViewport);

    return () => {
      tg.offEvent("viewportChanged", applyViewport);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
