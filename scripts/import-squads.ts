import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const WIKIPEDIA_API_URL =
  "https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&prop=wikitext&format=json&formatversion=2";

const WIKIPEDIA_PAGEIMAGES_URL =
  "https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=256&redirects=1&format=json&formatversion=2";

const WIKIPEDIA_USER_AGENT = "predictorwc2026bot/1.0 (squad import)";
const WIKI_PHOTO_BATCH_SIZE = 50;
const WIKI_PHOTO_BATCH_DELAY_MS = 300;
const WIKI_PHOTO_MAX_RETRIES = 5;

const WIKIPEDIA_TO_TEAM_NAME: Record<string, string> = {
  "United States": "USA",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
};

type PlayerPosition = "GK" | "DF" | "MF" | "FW";

interface ParsedPlayer {
  name: string;
  wikiTitle: string;
  position: PlayerPosition;
  shirtNumber: number;
}

interface ParsedSquad {
  wikipediaName: string;
  teamName: string;
  players: ParsedPlayer[];
}

interface WikiPageImage {
  title?: string;
  thumbnail?: { source?: string };
}

interface WikiPageImagesResponse {
  query?: {
    pages?: WikiPageImage[];
    redirects?: Array<{ from: string; to: string }>;
  };
}

const PLAYER_TEMPLATE_MARKER = "{{nat fs g player|";
const TEAM_SECTION_RE = /^===([^=]+)===$/gm;

function extractPlayerTemplateContents(sectionBody: string): string[] {
  const results: string[] = [];
  let searchFrom = 0;

  while (searchFrom < sectionBody.length) {
    const start = sectionBody.indexOf(PLAYER_TEMPLATE_MARKER, searchFrom);
    if (start === -1) break;

    let depth = 1;
    let index = start + 2;

    while (index < sectionBody.length && depth > 0) {
      if (sectionBody[index] === "{" && sectionBody[index + 1] === "{") {
        depth += 1;
        index += 2;
      } else if (sectionBody[index] === "}" && sectionBody[index + 1] === "}") {
        depth -= 1;
        index += 2;
      } else {
        index += 1;
      }
    }

    results.push(
      sectionBody.slice(start + PLAYER_TEMPLATE_MARKER.length, index - 2),
    );
    searchFrom = index;
  }

  return results;
}

function mapWikipediaTeamName(wikipediaName: string): string {
  return WIKIPEDIA_TO_TEAM_NAME[wikipediaName.trim()] ?? wikipediaName.trim();
}

function parsePlayerTemplate(content: string): ParsedPlayer | null {
  const noMatch = content.match(/(?:^|\|)no=(\d+)(?:\||$)/);
  const posMatch = content.match(/(?:^|\|)pos=(GK|DF|MF|FW)(?:\||$)/);
  const nameMatch = content.match(
    /(?:^|\|)name=\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/,
  );

  if (!noMatch || !posMatch || !nameMatch) return null;

  const wikiTitle = nameMatch[1].trim();
  const displayName = (nameMatch[2] ?? nameMatch[1]).trim();
  const shirtNumber = Number.parseInt(noMatch[1], 10);

  if (!wikiTitle || !displayName || Number.isNaN(shirtNumber)) return null;

  return {
    name: displayName,
    wikiTitle,
    position: posMatch[1] as PlayerPosition,
    shirtNumber,
  };
}

function parseSquads(wikitext: string): ParsedSquad[] {
  const statisticsIndex = wikitext.indexOf("==Statistics==");
  const relevantText =
    statisticsIndex === -1 ? wikitext : wikitext.slice(0, statisticsIndex);

  const squads: ParsedSquad[] = [];
  const sectionMatches = [...relevantText.matchAll(TEAM_SECTION_RE)];

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const wikipediaName = match[1].trim();
    const sectionStart = match.index! + match[0].length;
    const sectionEnd =
      i + 1 < sectionMatches.length
        ? sectionMatches[i + 1].index!
        : relevantText.length;
    const sectionBody = relevantText.slice(sectionStart, sectionEnd);

    const players: ParsedPlayer[] = [];
    for (const templateContent of extractPlayerTemplateContents(sectionBody)) {
      const parsed = parsePlayerTemplate(templateContent);
      if (parsed) players.push(parsed);
    }

    if (players.length === 0) continue;

    squads.push({
      wikipediaName,
      teamName: mapWikipediaTeamName(wikipediaName),
      players,
    });
  }

  return squads;
}

async function fetchWikitext(): Promise<string> {
  const response = await fetch(WIKIPEDIA_API_URL, {
    headers: { "User-Agent": WIKIPEDIA_USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Wikipedia: ${response.status}`);
  }

  const data = (await response.json()) as {
    parse?: { wikitext?: string };
  };

  const wikitext = data.parse?.wikitext;
  if (!wikitext) {
    throw new Error("Wikipedia response missing wikitext");
  }

  return wikitext;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  label: string,
): Promise<Response> {
  for (let attempt = 0; attempt < WIKI_PHOTO_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": WIKIPEDIA_USER_AGENT },
    });

    if (response.ok) {
      return response;
    }

    if (response.status === 429 && attempt < WIKI_PHOTO_MAX_RETRIES - 1) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10)
        : 2 ** attempt;
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : (attempt + 1) * 2000;
      console.warn(
        `${label}: rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${WIKI_PHOTO_MAX_RETRIES})`,
      );
      await sleep(delayMs);
      continue;
    }

    throw new Error(`Failed to fetch ${label}: ${response.status}`);
  }

  throw new Error(`Failed to fetch ${label} after retries`);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchWikiPhotoUrls(
  wikiTitles: string[],
): Promise<Map<string, string | null>> {
  const uniqueTitles = [...new Set(wikiTitles)];
  const photoByTitle = new Map<string, string | null>();

  for (const title of uniqueTitles) {
    photoByTitle.set(title, null);
  }

  const batches = chunkArray(uniqueTitles, WIKI_PHOTO_BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex]!;
    const url = `${WIKIPEDIA_PAGEIMAGES_URL}&titles=${batch.map((title) => encodeURIComponent(title)).join("|")}`;
    const response = await fetchWithRetry(url, "Wikipedia pageimages");
    const data = (await response.json()) as WikiPageImagesResponse;
    const pages = data.query?.pages ?? [];
    const redirects = data.query?.redirects ?? [];

    const photoByResolvedTitle = new Map<string, string>();
    for (const page of pages) {
      const source = page.thumbnail?.source;
      if (page.title && source) {
        photoByResolvedTitle.set(page.title, source);
      }
    }

    const redirectTargetByFrom = new Map(
      redirects.map((redirect) => [redirect.from, redirect.to]),
    );

    for (const title of batch) {
      const resolvedTitle = redirectTargetByFrom.get(title) ?? title;
      photoByTitle.set(
        title,
        photoByResolvedTitle.get(resolvedTitle) ?? null,
      );
    }

    if (batchIndex < batches.length - 1) {
      await sleep(WIKI_PHOTO_BATCH_DELAY_MS);
    }
  }

  return photoByTitle;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);
  const wikitext = await fetchWikitext();
  const squads = parseSquads(wikitext);

  console.log(`Parsed ${squads.length} squads from Wikipedia.`);

  const wikiTitles = squads.flatMap((squad) =>
    squad.players.map((player) => player.wikiTitle),
  );
  const photoByWikiTitle = await fetchWikiPhotoUrls(wikiTitles);
  const withPhoto = [...photoByWikiTitle.values()].filter(Boolean).length;
  console.log(
    `Resolved photos for ${withPhoto}/${photoByWikiTitle.size} unique wiki titles.`,
  );

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name");

  if (teamsError) throw teamsError;

  const teamIdByName = new Map((teams ?? []).map((team) => [team.name, team.id]));

  let imported = 0;
  let photosImported = 0;

  for (const squad of squads) {
    const teamId = teamIdByName.get(squad.teamName);
    if (!teamId) {
      throw new Error(
        `Team not found in database: "${squad.teamName}" (Wikipedia: "${squad.wikipediaName}")`,
      );
    }

    if (squad.players.length < 23 || squad.players.length > 26) {
      console.warn(
        `Warning: ${squad.teamName} has ${squad.players.length} players (expected 23–26).`,
      );
    }

    for (const player of squad.players) {
      const photoUrl = photoByWikiTitle.get(player.wikiTitle) ?? null;
      if (photoUrl) photosImported++;

      const { error } = await supabase.from("players").upsert(
        {
          team_id: teamId,
          name: player.name,
          position: player.position,
          shirt_number: player.shirtNumber,
          wiki_title: player.wikiTitle,
          photo_url: photoUrl,
        },
        { onConflict: "team_id,name" },
      );

      if (error) throw error;
      imported++;
    }
  }

  console.log(
    `Imported ${imported} players across ${squads.length} teams (${photosImported} with photos).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
