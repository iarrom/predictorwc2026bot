import type { MatchEvent } from "@/entities/match/model/types";
import {
  formatEventMinute,
  formatEventTypeLabel,
} from "@/entities/match/lib/formatLiveData";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { cn } from "@/lib/utils";

interface MatchEventsTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

function eventIcon(type: MatchEvent["type"]): string {
  switch (type) {
    case "goal":
    case "penalty":
      return "⚽";
    case "own_goal":
      return "⚽";
    case "yellow_card":
      return "🟨";
    case "red_card":
    case "yellow_red_card":
      return "🟥";
    case "substitution":
      return "↔";
    default:
      return "•";
  }
}

function eventDescription(event: MatchEvent): string {
  if (event.type === "substitution") {
    return `${event.secondary_player_name ?? "?"} → ${event.player_name}`;
  }

  if (event.type === "goal" || event.type === "penalty" || event.type === "own_goal") {
    const assist = event.secondary_player_name
      ? ` (${event.secondary_player_name})`
      : "";
    const score =
      event.score_home != null && event.score_away != null
        ? ` ${formatMatchScore(event.score_home, event.score_away)}`
        : "";
    return `${event.player_name}${assist}${score}`;
  }

  return event.player_name;
}

export function MatchEventsTimeline({
  events,
  homeTeamName,
  awayTeamName,
}: MatchEventsTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-white/50">No match events yet.</p>
    );
  }

  const sorted = [...events].sort((a, b) => {
    const minuteDiff = a.minute - b.minute;
    if (minuteDiff !== 0) return minuteDiff;
    return (a.injury_time ?? 0) - (b.injury_time ?? 0);
  });

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((event) => {
        const isHome = event.side === "home";
        const teamName = isHome ? homeTeamName : awayTeamName;

        return (
          <li
            key={event.id}
            className={cn(
              "grid grid-cols-[auto_1fr] items-start gap-x-2 text-xs",
              isHome ? "text-left" : "text-right",
            )}
          >
            <span className="shrink-0 font-medium tabular-nums text-white/60">
              {formatEventMinute(event.minute, event.injury_time)}
            </span>

            <div
              className={cn(
                "flex min-w-0 flex-col gap-0.5",
                isHome ? "items-start" : "items-end",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden>{eventIcon(event.type)}</span>
                <span className="font-medium text-white/85">
                  {formatEventTypeLabel(event.type)}
                </span>
              </div>
              <p className="line-clamp-2 text-white/70">
                {eventDescription(event)}
              </p>
              <p className="text-[10px] text-white/45">{teamName}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
