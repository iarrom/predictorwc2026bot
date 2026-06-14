import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const PLAYER_PHOTOS_BUCKET = "player-photos";

interface SourcePlayer {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number | null;
  photo_url: string;
  team_name: string;
}

interface DestPlayer {
  id: string;
  team_id: string;
  name: string;
  shirt_number: number | null;
  photo_url: string | null;
  team_name: string;
}

function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function playerSurname(name: string): string {
  const parts = normalizePlayerName(name).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function isQualityPhotoUrl(url: string): boolean {
  return url.includes(`/${PLAYER_PHOTOS_BUCKET}/`);
}

function getPublicPlayerPhotoUrl(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PLAYER_PHOTOS_BUCKET}/${objectPath}`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function matchSourceToDest(
  source: SourcePlayer,
  destPlayers: DestPlayer[],
): DestPlayer | null {
  if (source.shirt_number != null) {
    const byNumber = destPlayers.find(
      (player) => player.shirt_number === source.shirt_number,
    );
    if (byNumber) return byNumber;
  }

  const sourceName = normalizePlayerName(source.name);
  const byName = destPlayers.find(
    (player) => normalizePlayerName(player.name) === sourceName,
  );
  if (byName) return byName;

  const sourceLast = playerSurname(source.name);
  if (sourceLast.length > 0) {
    const candidates = destPlayers.filter(
      (player) => playerSurname(player.name) === sourceLast,
    );
    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

async function downloadPhoto(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = await response.arrayBuffer();

  return { bytes: new Uint8Array(buffer), contentType };
}

async function main() {
  const sourceUrl = requireEnv("SOURCE_SUPABASE_URL");
  const sourceKey = requireEnv("SOURCE_SUPABASE_SERVICE_ROLE_KEY");
  const destUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const destKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const source = createClient(sourceUrl, sourceKey);
  const dest = createClient(destUrl, destKey);

  const { data: sourcePlayers, error: sourceError } = await source
    .from("players")
    .select("id, team_id, name, shirt_number, photo_url, teams!inner(name)")
    .not("photo_url", "is", null);

  if (sourceError) {
    throw new Error(`Source query failed: ${sourceError.message}`);
  }

  const { data: destPlayers, error: destError } = await dest
    .from("players")
    .select("id, team_id, name, shirt_number, photo_url, teams!inner(name)");

  if (destError) {
    throw new Error(`Dest query failed: ${destError.message}`);
  }

  const sourceRows: SourcePlayer[] = (sourcePlayers ?? [])
    .map((row) => {
      const teams = row.teams as { name: string } | { name: string }[];
      const teamName = Array.isArray(teams) ? teams[0]?.name : teams.name;

      return {
        id: row.id,
        team_id: row.team_id,
        name: row.name,
        shirt_number: row.shirt_number,
        photo_url: row.photo_url as string,
        team_name: teamName,
      };
    })
    .filter((row) => isQualityPhotoUrl(row.photo_url));

  const destRows: DestPlayer[] = (destPlayers ?? []).map((row) => {
    const teams = row.teams as { name: string } | { name: string }[];
    const teamName = Array.isArray(teams) ? teams[0]?.name : teams.name;

    return {
      id: row.id,
      team_id: row.team_id,
      name: row.name,
      shirt_number: row.shirt_number,
      photo_url: row.photo_url,
      team_name: teamName,
    };
  });

  const destByTeam = new Map<string, DestPlayer[]>();
  for (const player of destRows) {
    const list = destByTeam.get(player.team_name) ?? [];
    list.push(player);
    destByTeam.set(player.team_name, list);
  }

  let copied = 0;
  let skipped = 0;
  let alreadyGood = 0;
  const unmatched: string[] = [];
  const failed: string[] = [];

  console.log(
    `Copying ${sourceRows.length} quality photos from source (${(sourcePlayers ?? []).length} total with any photo_url)`,
  );

  for (const sourcePlayer of sourceRows) {
    const destPlayer = matchSourceToDest(
      sourcePlayer,
      destByTeam.get(sourcePlayer.team_name) ?? [],
    );

    if (!destPlayer) {
      unmatched.push(`${sourcePlayer.team_name} · ${sourcePlayer.name}`);
      skipped += 1;
      continue;
    }

    if (destPlayer.photo_url && isQualityPhotoUrl(destPlayer.photo_url)) {
      alreadyGood += 1;
      continue;
    }

    try {
      const { bytes, contentType } = await downloadPhoto(sourcePlayer.photo_url);
      const objectPath = `${destPlayer.team_id}/${destPlayer.id}.png`;

      const { error: uploadError } = await dest.storage
        .from(PLAYER_PHOTOS_BUCKET)
        .upload(objectPath, bytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const publicUrl = getPublicPlayerPhotoUrl(destUrl, objectPath);
      const { error: updateError } = await dest
        .from("players")
        .update({ photo_url: publicUrl })
        .eq("id", destPlayer.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      destPlayer.photo_url = publicUrl;
      copied += 1;
      console.log(`✓ ${destPlayer.team_name} · ${destPlayer.name}`);
    } catch (error) {
      skipped += 1;
      failed.push(
        `${sourcePlayer.team_name} · ${sourcePlayer.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  console.log(
    `\nDone: ${copied} copied, ${alreadyGood} already had storage photos, ${skipped} skipped.`,
  );

  if (unmatched.length > 0) {
    console.log(`\nUnmatched in dest (${unmatched.length}):`);
    for (const name of unmatched.slice(0, 20)) {
      console.log(`  - ${name}`);
    }
    if (unmatched.length > 20) {
      console.log(`  ... and ${unmatched.length - 20} more`);
    }
  }

  if (failed.length > 0) {
    console.log(`\nFailed (${failed.length}):`);
    for (const message of failed.slice(0, 10)) {
      console.log(`  - ${message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
