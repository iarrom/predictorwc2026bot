import type { TeamLineup } from "@/entities/match/model/types";

interface MatchLineupsProps {
  homeTeamName: string;
  awayTeamName: string;
  homeLineup: TeamLineup | null;
  awayLineup: TeamLineup | null;
}

function LineupColumn({
  teamName,
  lineup,
}: {
  teamName: string;
  lineup: TeamLineup;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div>
        <p className="line-clamp-1 text-xs font-semibold text-white/90">
          {teamName}
        </p>
        {lineup.formation && (
          <p className="text-[10px] text-white/50">{lineup.formation}</p>
        )}
        {lineup.coach && (
          <p className="text-[10px] text-white/45">Coach: {lineup.coach}</p>
        )}
      </div>

      {lineup.lineup.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
            Starting XI
          </p>
          <ul className="flex flex-col gap-0.5">
            {lineup.lineup.map((player) => (
              <li
                key={`${player.id}-${player.shirtNumber ?? player.name}`}
                className="flex items-baseline gap-1.5 text-[11px] text-white/75"
              >
                {player.shirtNumber != null && (
                  <span className="w-4 shrink-0 tabular-nums text-white/45">
                    {player.shirtNumber}
                  </span>
                )}
                <span className="min-w-0 truncate">{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lineup.bench.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
            Bench
          </p>
          <ul className="flex flex-col gap-0.5">
            {lineup.bench.map((player) => (
              <li
                key={`bench-${player.id}-${player.shirtNumber ?? player.name}`}
                className="flex items-baseline gap-1.5 text-[11px] text-white/60"
              >
                {player.shirtNumber != null && (
                  <span className="w-4 shrink-0 tabular-nums text-white/40">
                    {player.shirtNumber}
                  </span>
                )}
                <span className="min-w-0 truncate">{player.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MatchLineups({
  homeTeamName,
  awayTeamName,
  homeLineup,
  awayLineup,
}: MatchLineupsProps) {
  if (!homeLineup && !awayLineup) {
    return (
      <p className="text-xs text-white/50">Lineups not available yet.</p>
    );
  }

  return (
    <div className="flex gap-4">
      {homeLineup ? (
        <LineupColumn teamName={homeTeamName} lineup={homeLineup} />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50">{homeTeamName}: TBD</p>
        </div>
      )}

      {awayLineup ? (
        <LineupColumn teamName={awayTeamName} lineup={awayLineup} />
      ) : (
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs text-white/50">{awayTeamName}: TBD</p>
        </div>
      )}
    </div>
  );
}
