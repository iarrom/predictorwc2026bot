import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = "UTC";

interface ReminderMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
}

interface ReminderProfile {
  id: string;
  telegram_id: number;
  timezone: string | null;
}

function resolveTimeZone(timezone: string | null): string {
  if (!timezone) return DEFAULT_TIMEZONE;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function formatKickoffLine(kickoffAt: string, timeZone: string): string {
  const kickoff = new Date(kickoffAt);
  const now = new Date();

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
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
    return `today at ${time}`;
  }

  const dayFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${dayFormatter.format(kickoff)} at ${time}`;
}

function buildDigestMessage(
  matches: ReminderMatch[],
  timeZone: string,
): string {
  const lines = matches.map(
    (match) =>
      `• ${match.home_team_name} vs ${match.away_team_name} — ${formatKickoffLine(match.kickoff_at, timeZone)}`,
  );

  return [
    "⚽️ Prediction reminder",
    "",
    "You haven't predicted these upcoming matches:",
    "",
    ...lines,
    "",
    "Kickoff times are shown in your local time. Predictions close at kickoff!",
  ].join("\n");
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  miniAppUrl: string,
): Promise<boolean> {
  const appUrl = `${miniAppUrl.replace(/\/$/, "")}/matches`;
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [[
            {
              text: "⚡️ Make predictions",
              web_app: { url: appUrl },
            },
          ]],
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error("sendMessage failed", chatId, response.status, body);
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const miniAppUrl = Deno.env.get("MINI_APP_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cronSecret || !botToken || !miniAppUrl || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing required environment secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const nowIso = new Date().toISOString();
  const windowEndIso = new Date(Date.now() + SIX_HOURS_MS).toISOString();

  try {
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team_name, away_team_name, kickoff_at")
      .eq("status", "scheduled")
      .gt("kickoff_at", nowIso)
      .lte("kickoff_at", windowEndIso)
      .order("kickoff_at", { ascending: true });

    if (matchesError) {
      throw matchesError;
    }

    const reminderMatches = (matches ?? []) as ReminderMatch[];
    if (reminderMatches.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          sent: 0,
          skipped: 0,
          matchesInWindow: 0,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const matchIds = reminderMatches.map((match) => match.id);

    const [
      { data: profiles, error: profilesError },
      { data: predictions, error: predictionsError },
      { data: reminders, error: remindersError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, telegram_id, timezone")
        .in("role", ["participant", "admin"])
        .not("telegram_id", "is", null),
      supabase
        .from("predictions")
        .select("user_id, match_id")
        .in("match_id", matchIds),
      supabase
        .from("prediction_reminders")
        .select("user_id, match_id")
        .in("match_id", matchIds),
    ]);

    if (profilesError) throw profilesError;
    if (predictionsError) throw predictionsError;
    if (remindersError) throw remindersError;

    const predictedKeys = new Set(
      (predictions ?? []).map((row) => `${row.user_id}:${row.match_id}`),
    );
    const remindedKeys = new Set(
      (reminders ?? []).map((row) => `${row.user_id}:${row.match_id}`),
    );

    let sent = 0;
    let skipped = 0;

    for (const profile of (profiles ?? []) as ReminderProfile[]) {
      const pendingMatches = reminderMatches.filter((match) => {
        const key = `${profile.id}:${match.id}`;
        return !predictedKeys.has(key) && !remindedKeys.has(key);
      });

      if (pendingMatches.length === 0) {
        continue;
      }

      const timeZone = resolveTimeZone(profile.timezone);
      const message = buildDigestMessage(pendingMatches, timeZone);
      const delivered = await sendTelegramMessage(
        botToken,
        profile.telegram_id,
        message,
        miniAppUrl,
      );

      if (!delivered) {
        skipped++;
        continue;
      }

      const { error: logError } = await supabase
        .from("prediction_reminders")
        .insert(
          pendingMatches.map((match) => ({
            user_id: profile.id,
            match_id: match.id,
          })),
        );

      if (logError) {
        console.error("prediction_reminders insert failed", profile.id, logError);
        skipped++;
        continue;
      }

      sent++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent,
        skipped,
        matchesInWindow: reminderMatches.length,
        eligibleProfiles: (profiles ?? []).length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
