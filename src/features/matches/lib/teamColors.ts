export interface TeamColorRow {
  name: string;
  primary_color: string | null;
}

/**
 * Curated primary colors from flag SVGs. Used as fallback when DB has no value.
 * Populated via `pnpm extract:team-colors` or maintained manually.
 */
export const STATIC_TEAM_COLORS: Record<string, string> = {
  Mexico: "#006847",
  "South Africa": "#007A4D",
  "South Korea": "#CD2E3A",
  "Czech Republic": "#11457E",
  Belgium: "#EF3340",
  Japan: "#BC002D",
  France: "#002395",
  Germany: "#DD0000",
  Brazil: "#009C3B",
  Argentina: "#74ACDF",
  England: "#CF081F",
  Scotland: "#005EB8",
  USA: "#B22234",
  Netherlands: "#FF6600",
  Spain: "#AA151B",
  Portugal: "#006600",
  Croatia: "#FF0000",
  Switzerland: "#FF0000",
  Canada: "#FF0000",
  "Ivory Coast": "#F77F00",
  Colombia: "#FCD116",
  Ghana: "#EF3340",
  Senegal: "#00853F",
  Morocco: "#C1272D",
  Egypt: "#CE1126",
  "Saudi Arabia": "#006C35",
  Iran: "#239F40",
  Qatar: "#8A1538",
  Australia: "#00008B",
  "New Zealand": "#00247D",
  Uruguay: "#0038A8",
  Paraguay: "#0038A8",
  Ecuador: "#FFD100",
  Chile: "#D52B1E",
  "Bosnia & Herzegovina": "#002395",
  Haiti: "#00209F",
  Turkey: "#E30A17",
  Sweden: "#006AA7",
  Tunisia: "#E70013",
  "Cape Verde": "#003893",
  Algeria: "#006233",
  Austria: "#ED2939",
  Jordan: "#007A3D",
  "DR Congo": "#007FFF",
  Uzbekistan: "#1EB53A",
  Iraq: "#CE1126",
  Norway: "#BA0C2F",
  Panama: "#DA121A",
};

export const DEFAULT_TEAM_COLOR = "#1b2356";

export function buildTeamColorsMap(
  teams: TeamColorRow[] = [],
): Record<string, string> {
  const fromDb = Object.fromEntries(
    teams
      .filter((team): team is TeamColorRow & { primary_color: string } =>
        Boolean(team.primary_color),
      )
      .map((team) => [team.name, team.primary_color]),
  );

  return { ...STATIC_TEAM_COLORS, ...fromDb };
}

export function getTeamColor(
  teamColors: Record<string, string>,
  teamName: string,
): string {
  return teamColors[teamName] ?? STATIC_TEAM_COLORS[teamName] ?? DEFAULT_TEAM_COLOR;
}
