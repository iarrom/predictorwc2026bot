import { createTranslator } from "next-intl";
import { normalizeLocale, toIntlLocale } from "@/i18n/config";
import type { Locale } from "@/shared/types/database";

interface PingMatchInput {
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
}

function partValue(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value;
}

function formatKickoffLine(
  kickoffAt: string,
  timeZone: string,
  locale: Locale,
  t: ReturnType<typeof createTranslator>,
): string {
  const kickoff = new Date(kickoffAt);
  const now = new Date();
  const intlLocale = toIntlLocale(locale);

  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const todayParts = dateFormatter.formatToParts(now);
  const kickoffParts = dateFormatter.formatToParts(kickoff);
  const time = timeFormatter.format(kickoff);

  const isToday =
    partValue(todayParts, "year") === partValue(kickoffParts, "year") &&
    partValue(todayParts, "month") === partValue(kickoffParts, "month") &&
    partValue(todayParts, "day") === partValue(kickoffParts, "day");

  if (isToday) {
    return t("todayAt", { time });
  }

  const dayFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return t("at", { date: dayFormatter.format(kickoff), time });
}

export async function buildPingMessage(
  match: PingMatchInput,
  recipientLocale: string | null | undefined,
  recipientTimezone: string | null | undefined,
): Promise<{ text: string; buttonText: string }> {
  const locale = normalizeLocale(recipientLocale ?? undefined);
  const messages = (await import(`../../../../messages/${locale}.json`)).default;
  const t = createTranslator({ locale, messages, namespace: "admin.ping" });
  const timeZone = recipientTimezone?.trim() || "UTC";
  const kickoffLine = formatKickoffLine(match.kickoff_at, timeZone, locale, t);

  const text = [
    t("title"),
    "",
    t("intro"),
    "",
    `• ${match.home_team_name} vs ${match.away_team_name} — ${kickoffLine}`,
    "",
    t("footer"),
  ].join("\n");

  return { text, buttonText: t("button") };
}
