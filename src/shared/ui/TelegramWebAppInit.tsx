"use client";

import { useEffect } from "react";

export function TelegramWebAppInit() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
  }, []);

  return null;
}
