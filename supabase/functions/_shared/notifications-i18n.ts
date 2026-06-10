export type NotificationLocale = "en" | "ru" | "pl";

const defaultLocale: NotificationLocale = "en";

export function normalizeNotificationLocale(
  locale: string | null | undefined,
): NotificationLocale {
  if (locale === "ru" || locale === "pl") return locale;
  return defaultLocale;
}

export function toIntlLocale(locale: NotificationLocale): string {
  switch (locale) {
    case "ru":
      return "ru-RU";
    case "pl":
      return "pl-PL";
    default:
      return "en-GB";
  }
}

type GoalEventType = "goal" | "penalty" | "own_goal";

const goalTypeSuffix: Record<NotificationLocale, Record<GoalEventType, string>> = {
  en: {
    goal: "",
    penalty: " (penalty)",
    own_goal: " (own goal)",
  },
  ru: {
    goal: "",
    penalty: " (пенальти)",
    own_goal: " (автогол)",
  },
  pl: {
    goal: "",
    penalty: " (karny)",
    own_goal: " (samobój)",
  },
};

const goalMessages: Record<NotificationLocale, { title: string; button: string }> = {
  en: {
    title: "GOAL",
    button: "⚽️ Open matches",
  },
  ru: {
    title: "ГОЛ",
    button: "⚽️ Открыть матчи",
  },
  pl: {
    title: "GOL",
    button: "⚽️ Otwórz mecze",
  },
};

const reminderMessages: Record<
  NotificationLocale,
  {
    title: string;
    intro: string;
    footer: string;
    button: string;
    todayAt: (time: string) => string;
    at: (date: string, time: string) => string;
  }
> = {
  en: {
    title: "⚽️ Prediction reminder",
    intro: "You haven't predicted these upcoming matches:",
    footer:
      "Kickoff times are shown in your local time. Predictions close at kickoff!",
    button: "⚡️ Make predictions",
    todayAt: (time) => `today at ${time}`,
    at: (date, time) => `${date} at ${time}`,
  },
  ru: {
    title: "⚽️ Напоминание о прогнозе",
    intro: "Вы ещё не сделали прогноз на эти матчи:",
    footer:
      "Время указано в вашем часовом поясе. Прогнозы закрываются с началом матча!",
    button: "⚡️ Сделать прогноз",
    todayAt: (time) => `сегодня в ${time}`,
    at: (date, time) => `${date} в ${time}`,
  },
  pl: {
    title: "⚽️ Przypomnienie o typie",
    intro: "Nie obstawiłeś tych nadchodzących meczów:",
    footer:
      "Godziny podane w Twojej strefie czasowej. Typy zamykają się wraz z rozpoczęciem meczu!",
    button: "⚡️ Obstaw mecze",
    todayAt: (time) => `dziś o ${time}`,
    at: (date, time) => `${date} o ${time}`,
  },
};

export function formatGoalTypeSuffix(
  type: GoalEventType,
  locale: NotificationLocale,
): string {
  return goalTypeSuffix[locale][type] ?? "";
}

interface GoalEventInput {
  type: GoalEventType;
  minute: number;
  injury_time: number | null;
  player_name: string;
  score_home: number | null;
  score_away: number | null;
}

interface MatchInfoInput {
  home_team_name: string;
  away_team_name: string;
  round_display: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
}

function formatEventMinute(minute: number, injuryTime: number | null): string {
  if (injuryTime != null && injuryTime > 0) {
    return `${minute}+${injuryTime}'`;
  }
  return `${minute}'`;
}

export function buildGoalMessage(
  event: GoalEventInput,
  match: MatchInfoInput,
  locale: NotificationLocale,
): string {
  const scoreHome = event.score_home ?? match.home_score ?? 0;
  const scoreAway = event.score_away ?? match.away_score ?? 0;
  const roundLabel = match.group_name ?? match.round_display;
  const minuteLabel = formatEventMinute(event.minute, event.injury_time);
  const typeSuffix = formatGoalTypeSuffix(event.type, locale);
  const { title } = goalMessages[locale];

  return [
    `⚽️ ${title} — ${match.home_team_name} ${scoreHome}:${scoreAway} ${match.away_team_name}`,
    roundLabel,
    `${minuteLabel} ${event.player_name}${typeSuffix}`,
  ].join("\n");
}

export function getGoalNotificationButton(
  locale: NotificationLocale,
): string {
  return goalMessages[locale].button;
}

interface ReminderMatchInput {
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
}

export function formatKickoffLine(
  kickoffAt: string,
  timeZone: string,
  locale: NotificationLocale,
): string {
  const kickoff = new Date(kickoffAt);
  const now = new Date();
  const intlLocale = toIntlLocale(locale);
  const messages = reminderMessages[locale];

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

  const partValue = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value;

  const todayParts = dateFormatter.formatToParts(now);
  const kickoffParts = dateFormatter.formatToParts(kickoff);
  const time = timeFormatter.format(kickoff);

  const isToday =
    partValue(todayParts, "year") === partValue(kickoffParts, "year") &&
    partValue(todayParts, "month") === partValue(kickoffParts, "month") &&
    partValue(todayParts, "day") === partValue(kickoffParts, "day");

  if (isToday) {
    return messages.todayAt(time);
  }

  const dayFormatter = new Intl.DateTimeFormat(intlLocale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return messages.at(dayFormatter.format(kickoff), time);
}

export function buildDigestMessage(
  matches: ReminderMatchInput[],
  timeZone: string,
  locale: NotificationLocale,
): string {
  const messages = reminderMessages[locale];
  const lines = matches.map(
    (match) =>
      `• ${match.home_team_name} vs ${match.away_team_name} — ${formatKickoffLine(match.kickoff_at, timeZone, locale)}`,
  );

  return [
    messages.title,
    "",
    messages.intro,
    "",
    ...lines,
    "",
    messages.footer,
  ].join("\n");
}

export function getReminderNotificationButton(
  locale: NotificationLocale,
): string {
  return reminderMessages[locale].button;
}
