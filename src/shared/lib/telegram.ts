import "server-only";

import { getEnv } from "@/shared/lib/env";

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  buttonText?: string,
  miniAppUrl?: string,
): Promise<boolean> {
  const botToken = getEnv("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("sendTelegramMessage: missing TELEGRAM_BOT_TOKEN");
    return false;
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (buttonText && miniAppUrl) {
    const appUrl = `${miniAppUrl.replace(/\/$/, "")}/matches`;
    body.reply_markup = {
      inline_keyboard: [[{ text: buttonText, web_app: { url: appUrl } }]],
    };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const responseBody = await response.text();
    console.error("sendMessage failed", chatId, response.status, responseBody);
    return false;
  }

  return true;
}
