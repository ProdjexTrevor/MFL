import { cached, delay } from "./cache.js";

function envValue(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

const YEAR = envValue("MFL_YEAR", "2026");
const LEAGUE_ID = envValue("MFL_LEAGUE_ID", "49177");
const HOST = envValue("MFL_HOST", "www44.myfantasyleague.com");
const USER_AGENT = envValue("MFL_USER_AGENT", "OldBarLeagueDraftDash/1.0 (personal; league 49177)");
const APIKEY = process.env.MFL_APIKEY?.trim() ?? "";

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
  adpPosRank?: number;
  sharksRank?: number;
  sharksPosRank?: number;
  rookiePosRank?: number;
  isRookie?: boolean;
  draftYear?: number;
  espnId?: string;
  jersey?: string;
  college?: string;
  lastYearPts?: number;
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
  year = YEAR,
): Promise<unknown> {
  return enqueue(async () => {
    const url = new URL(`https://${host}/${year}/${command}`);
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
        const debug = new URL(url);
        debug.searchParams.delete("APIKEY");
        throw new Error(`MFL ${command} ${res.status} ${res.statusText} for ${debug.pathname}`);
      }
      return res.json();
    }
    throw new Error("MFL request failed after retries");
  });
}

export async function fetchPlayers(): Promise<Player[]> {
  return cached("playersCard", 12 * 60 * 60 * 1000, async () => {
    const data = (await mflGet("api.myfantasyleague.com", "export", {
      TYPE: "players",
      DETAILS: "1",
    })) as {
      players?: {
        player?: Array<{
          id: string;
          name: string;
          position: string;
          team: string;
          draft_year?: string;
          espn_id?: string;
          jersey?: string;
          college?: string;
        }>;
      };
    };
    const seasonYear = Number(YEAR);
    return asArray(data.players?.player)
      .filter((p) => SKILL_POS.has(p.position))
      .map((p) => {
        const draftYear = p.draft_year ? Number(p.draft_year) : undefined;
        return {
          id: String(p.id),
          position: p.position,
          nflTeam: p.team || "FA",
          draftYear,
          isRookie: draftYear === seasonYear,
          espnId: p.espn_id ? String(p.espn_id) : undefined,
          jersey: p.jersey || undefined,
          college: p.college || undefined,
          ...displayName(p.name),
        };
      });
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

export async function fetchSharksRanks(): Promise<Map<string, number>> {
  const entries = await cached("sharksRanks", 6 * 60 * 60 * 1000, async () => {
    await delay(1200);
    const data = (await mflGet("api.myfantasyleague.com", "export", {
      TYPE: "playerRanks",
      SOURCE: "sharks",
    })) as {
      error?: { $t?: string };
      player_ranks?: { player?: Array<{ id: string; rank: string }> };
    };
    if (data.error) return [];
    return asArray(data.player_ranks?.player)
      .map((row) => [String(row.id), Number(row.rank)] as [string, number])
      .filter(([, rank]) => Number.isFinite(rank));
  });
  return new Map(Array.isArray(entries) ? entries : []);
}

function addPosRanks(
  players: Player[],
  overallOf: (player: Player) => number | undefined,
  assign: (player: Player, posRank: number) => void,
  include: (player: Player) => boolean = () => true,
) {
  const groups = new Map<string, Player[]>();
  for (const player of players) {
    if (!include(player) || overallOf(player) == null) continue;
    const list = groups.get(player.position) ?? [];
    list.push(player);
    groups.set(player.position, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (overallOf(a) ?? 9999) - (overallOf(b) ?? 9999));
    list.forEach((player, index) => assign(player, index + 1));
  }
}

export async function fetchLastYearScores(): Promise<Map<string, number>> {
  const lastYear = String(Number(YEAR) - 1);
  if (!Number.isFinite(Number(lastYear))) return new Map();
  const entries = await cached(`lastYearScores:${lastYear}`, 12 * 60 * 60 * 1000, async () => {
    await delay(1200);
    try {
      const data = (await mflGet(
        HOST,
        "export",
        { TYPE: "playerScores", L: LEAGUE_ID, W: "YTD" },
        lastYear,
      )) as {
        playerScores?: { playerScore?: Array<{ id?: string; score?: string }> };
      };
      return asArray(data.playerScores?.playerScore)
        .map((row) => [String(row.id), Number(row.score)] as [string, number])
        .filter(([id, pts]) => id && Number.isFinite(pts));
    } catch (err) {
      console.warn("Last-year player scores unavailable", err);
      return [];
    }
  });
  return new Map(Array.isArray(entries) ? entries : []);
}

export async function rankedPlayers(): Promise<Player[]> {
  const players = await fetchPlayers();
  const adp = await fetchAdp();
  const sharks = await fetchSharksRanks();
  const lastYearPts = await fetchLastYearScores();
  const ranked = players.map((player) => {
    const a = adp.get(player.id);
    const sharksRank = sharks.get(player.id);
    return {
      ...player,
      adpRank: a?.rank,
      adp: a?.adp,
      sharksRank,
      lastYearPts: lastYearPts.get(player.id),
    };
  });
  addPosRanks(ranked, (p) => p.adpRank, (p, n) => {
    p.adpPosRank = n;
  });
  addPosRanks(ranked, (p) => p.sharksRank, (p, n) => {
    p.sharksPosRank = n;
  });
  addPosRanks(
    ranked,
    (p) => p.sharksRank ?? p.adpRank,
    (p, n) => {
      p.rookiePosRank = n;
    },
    (p) => p.isRookie === true,
  );
  return ranked;
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
  const players = await rankedPlayers();
  await delay(1200);
  const league = await fetchLeague();
  return { league, players };
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
        adpPosRank: player?.adpPosRank,
        sharksRank: player?.sharksRank,
        sharksPosRank: player?.sharksPosRank,
        rookiePosRank: player?.rookiePosRank,
        isRookie: player?.isRookie,
        draftYear: player?.draftYear,
        espnId: player?.espnId,
        jersey: player?.jersey,
        college: player?.college,
        lastYearPts: player?.lastYearPts,
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
