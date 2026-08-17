import { cached, delay } from "./cache.js";

const YEAR = process.env.MFL_YEAR ?? "2026";
const LEAGUE_ID = process.env.MFL_LEAGUE_ID ?? "49177";
const HOST = process.env.MFL_HOST ?? "www44.myfantasyleague.com";
const USER_AGENT =
  process.env.MFL_USER_AGENT ?? "OldBarLeagueDraftDash/1.0 (personal; league 49177)";
const APIKEY = process.env.MFL_APIKEY ?? "";

const SKILL_POS = new Set(["QB", "RB", "WR", "TE"]);

let cooldownUntil = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = requestQueue.then(fn, fn);
  requestQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export type Player = {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  position: string;
  nflTeam: string;
  adpRank?: number;
  adp?: number;
};

export type Franchise = {
  id: string;
  name: string;
  abbrev: string;
  division?: string;
};

export type DraftPick = {
  round: number;
  pick: number;
  overall: number;
  franchiseId: string;
  playerId: string | null;
  comments: string;
  timestamp: string;
};

export type RosterSlot = {
  id: string;
  status: string;
};

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function displayName(raw: string): { name: string; lastName: string; firstName: string } {
  if (!raw) return { name: "Unknown", lastName: "", firstName: "" };
  if (raw.includes(",")) {
    const [last, ...rest] = raw.split(",");
    const firstName = rest.join(",").trim();
    const lastName = last.trim();
    return { name: `${firstName} ${lastName}`.trim(), lastName, firstName };
  }
  return { name: raw, lastName: raw, firstName: "" };
}

async function mflGet(
  host: string,
  command: string,
  params: Record<string, string>,
): Promise<unknown> {
  return enqueue(async () => {
    const url = new URL(`https://${host}/${YEAR}/${command}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    url.searchParams.set("JSON", "1");
    if (APIKEY) url.searchParams.set("APIKEY", APIKEY);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const wait = cooldownUntil - Date.now();
      if (wait > 0) await delay(wait);

      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const backoff =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 8000 * 2 ** attempt;
        cooldownUntil = Date.now() + backoff;
        if (attempt === 3) {
          throw new Error(`MFL is rate-limiting requests. Retry in ${Math.ceil(backoff / 1000)}s`);
        }
        await delay(backoff);
        continue;
      }
      if (!res.ok) {
        throw new Error(`MFL ${command} ${res.status} ${res.statusText}`);
      }
      return res.json();
    }
    throw new Error("MFL request failed after retries");
  });
}

export async function fetchPlayers(): Promise<Player[]> {
  return cached("players", 12 * 60 * 60 * 1000, async () => {
    const data = (await mflGet("api.myfantasyleague.com", "export", {
      TYPE: "players",
    })) as {
      players?: { player?: Array<{ id: string; name: string; position: string; team: string }> };
    };
    return asArray(data.players?.player)
      .filter((p) => SKILL_POS.has(p.position))
      .map((p) => ({
        id: String(p.id),
        position: p.position,
        nflTeam: p.team || "FA",
        ...displayName(p.name),
      }));
  });
}

export async function fetchAdp(): Promise<Map<string, { rank: number; adp: number }>> {
  const entries = await cached("adp", 60 * 60 * 1000, async () => {
    await delay(1200);
    const data = (await mflGet("api.myfantasyleague.com", "export", {
      TYPE: "adp",
      FRANCHISES: "10",
      IS_KEEPER: "1",
    })) as {
      adp?: {
        player?: Array<{ id: string; rank: string; averagePick: string }>;
      };
    };
    let rows = asArray(data.adp?.player);
    if (rows.length === 0) {
      const fallback = (await mflGet("api.myfantasyleague.com", "export", {
        TYPE: "adp",
      })) as { adp?: { player?: Array<{ id: string; rank: string; averagePick: string }> } };
      rows = asArray(fallback.adp?.player);
    }
    return rows.map((row) => [
      String(row.id),
      { rank: Number(row.rank), adp: Number(row.averagePick) },
    ] as [string, { rank: number; adp: number }]);
  });
  return new Map(Array.isArray(entries) ? entries : []);
}

export async function fetchLeague(): Promise<{
  id: string;
  name: string;
  year: string;
  host: string;
  rosterSize: number;
  draftKind: string;
  draftType: string;
  franchises: Franchise[];
}> {
  return cached("league", 30 * 60 * 1000, async () => {
    const data = (await mflGet(HOST, "export", {
      TYPE: "league",
      L: LEAGUE_ID,
    })) as {
      league?: {
        id: string;
        name: string;
        rosterSize?: string;
        draft_kind?: string;
        baseURL?: string;
        franchises?: {
          franchise?: Array<{
            id: string;
            name: string;
            abbrev?: string;
            division?: string;
          }>;
        };
      };
    };
    const league = data.league;
    if (!league) throw new Error("League not found");
    const franchises = asArray(league.franchises?.franchise)
      .map((f) => ({
        id: String(f.id),
        name: f.name,
        abbrev: f.abbrev || shortName(f.name),
        division: f.division,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return {
      id: league.id,
      name: league.name.trim(),
      year: YEAR,
      host: HOST,
      rosterSize: Number(league.rosterSize ?? 26),
      draftKind: league.draft_kind ?? "live",
      draftType: "SAME",
      franchises,
    };
  });
}

function shortName(name: string): string {
  if (name.length <= 12) return name;
  return name.split(/[\s-/]+/)[0] ?? name.slice(0, 10);
}

export async function fetchDraft(): Promise<{
  draftType: string;
  round1Order: string[];
  picks: DraftPick[];
}> {
  const data = (await mflGet(HOST, "export", {
    TYPE: "draftResults",
    L: LEAGUE_ID,
  })) as {
    draftResults?: {
      draftUnit?: {
        draftType?: string;
        round1DraftOrder?: string;
        draftPick?: Array<{
          round: string;
          pick: string;
          franchise: string;
          player?: string;
          comments?: string;
          timestamp?: string;
        }>;
      };
    };
  };
  const unit = data.draftResults?.draftUnit;
  const rawPicks = asArray(unit?.draftPick);
  const franchiseCount = new Set(rawPicks.map((p) => p.franchise)).size || 10;
  const picks = rawPicks.map((p) => {
    const round = Number(p.round);
    const pick = Number(p.pick);
    return {
      round,
      pick,
      overall: (round - 1) * franchiseCount + pick,
      franchiseId: String(p.franchise),
      playerId: p.player ? String(p.player) : null,
      comments: (p.comments ?? "").trim(),
      timestamp: p.timestamp ?? "",
    };
  });
  picks.sort((a, b) => a.overall - b.overall);
  return {
    draftType: unit?.draftType ?? "SAME",
    round1Order: (unit?.round1DraftOrder ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    picks,
  };
}

export async function fetchRosters(): Promise<Record<string, RosterSlot[]>> {
  const data = (await mflGet(HOST, "export", {
    TYPE: "rosters",
    L: LEAGUE_ID,
  })) as {
    rosters?: {
      franchise?: Array<{
        id: string;
        player?: Array<{ id: string; status?: string }> | { id: string; status?: string };
      }>;
    };
  };
  const map: Record<string, RosterSlot[]> = {};
  for (const franchise of asArray(data.rosters?.franchise)) {
    map[String(franchise.id)] = asArray(franchise.player).map((p) => ({
      id: String(p.id),
      status: p.status ?? "ROSTER",
    }));
  }
  return map;
}

export async function buildBootstrap() {
  const players = await fetchPlayers();
  const adp = await fetchAdp();
  await delay(1200);
  const league = await fetchLeague();
  const withAdp = players.map((p) => {
    const a = adp.get(p.id);
    return a ? { ...p, adpRank: a.rank, adp: a.adp } : p;
  });
  return { league, players: withAdp };
}

export async function buildLive(playerIndex: Map<string, Player>) {
  const draft = await fetchDraft();
  await delay(1200);
  const rostersRaw = await fetchRosters();
  const currentPick = draft.picks.find((p) => !p.playerId) ?? null;
  const picksMade = draft.picks.filter((p) => p.playerId).length;
  const rosters: Record<string, Array<Player & { status: string }>> = {};
  for (const [franchiseId, slots] of Object.entries(rostersRaw)) {
    rosters[franchiseId] = slots.map((slot) => {
      const player = playerIndex.get(slot.id);
      return {
        id: slot.id,
        name: player?.name ?? `Player ${slot.id}`,
        lastName: player?.lastName ?? "",
        firstName: player?.firstName ?? "",
        position: player?.position ?? "?",
        nflTeam: player?.nflTeam ?? "",
        adpRank: player?.adpRank,
        adp: player?.adp,
        status: slot.status,
      };
    });
  }
  return {
    fetchedAt: new Date().toISOString(),
    draftType: draft.draftType,
    round1Order: draft.round1Order,
    picks: draft.picks.map((p) => ({
      ...p,
      player: p.playerId ? playerIndex.get(p.playerId) ?? null : null,
    })),
    currentPick,
    picksMade,
    picksTotal: draft.picks.length,
    rosters,
  };
}
