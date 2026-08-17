import { cached, getCached, setCached } from "./cache.js";
import type { Player } from "./mfl.js";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const MFL_TO_ESPN: Record<string, string> = {
  TBB: "TB",
  NEP: "NE",
  GBP: "GB",
  NOS: "NO",
  KCC: "KC",
  LVR: "LV",
  SFO: "SF",
  JAC: "JAX",
  WAS: "WSH",
  WSH: "WSH",
  LA: "LAR",
  STL: "LAR",
  SD: "LAC",
};

const ESPN_TEAM_IDS: Record<string, string> = {
  ARI: "22",
  ATL: "1",
  BAL: "33",
  BUF: "2",
  CAR: "29",
  CHI: "3",
  CIN: "4",
  CLE: "5",
  DAL: "6",
  DEN: "7",
  DET: "8",
  GB: "9",
  HOU: "34",
  IND: "11",
  JAX: "30",
  KC: "12",
  LV: "13",
  LAC: "24",
  LAR: "14",
  MIA: "15",
  MIN: "16",
  NE: "17",
  NO: "18",
  NYG: "19",
  NYJ: "20",
  PHI: "21",
  PIT: "23",
  SF: "25",
  SEA: "26",
  TB: "27",
  TEN: "10",
  WSH: "28",
};

export type NewsItem = { title: string; url: string; source?: string };

export type DepthSpot = {
  team: string;
  chart: string;
  slot: string;
  rank: number;
  label: string;
  ahead: string[];
  unit: Array<{ rank: number; name: string; self: boolean }>;
};

function espnAbbr(mflTeam: string): string | null {
  if (!mflTeam || mflTeam === "FA") return null;
  return MFL_TO_ESPN[mflTeam] ?? mflTeam;
}

function seasonYears(): number[] {
  const year = Number(process.env.MFL_YEAR?.trim() || "2026") || 2026;
  return [year, year - 1];
}

async function espnJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
      Referer: "https://www.espn.com/",
    },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return (await res.json()) as T;
}

function athleteIdFromRef(ref?: string): string | null {
  if (!ref) return null;
  return ref.match(/\/athletes\/(\d+)/)?.[1] ?? null;
}

function namesMatch(espnName: string, player: Player) {
  const a = espnName.toLowerCase().replace(/[^a-z]/g, "");
  const b = player.name.toLowerCase().replace(/[^a-z]/g, "");
  return a === b;
}

type CoreAthlete = { id: string; rank: number };

type CoreChart = {
  name: string;
  positions?: Record<
    string,
    {
      position?: { abbreviation?: string };
      athletes?: Array<{ rank?: number; athlete?: { $ref?: string } }>;
    }
  >;
};

async function espnOffenseChart(teamId: string): Promise<CoreChart | null> {
  return cached(`espnCoreDepth:${teamId}`, 30 * 60 * 1000, async () => {
    for (const year of seasonYears()) {
      try {
        const data = await espnJson<{ items?: CoreChart[] }>(
          `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${year}/teams/${teamId}/depthcharts?lang=en&region=us`,
        );
        const charts = data.items ?? [];
        const offense =
          charts.find((chart) =>
            Object.keys(chart.positions ?? {}).some((key) => /^(qb|rb|te|wr)$/i.test(key)),
          ) ?? null;
        if (offense) return offense;
      } catch {
        // Try the previous NFL season if this year's chart is missing.
      }
    }
    return null;
  });
}

async function espnAthleteName(id: string): Promise<string> {
  return cached(`espnAthleteName:${id}`, 24 * 60 * 60 * 1000, async () => {
    const data = await espnJson<{ displayName?: string; fullName?: string }>(
      `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes/${id}?lang=en&region=us`,
    );
    return data.displayName || data.fullName || `ESPN ${id}`;
  });
}

function coreAthletes(
  group:
    | {
        athletes?: Array<{ rank?: number; athlete?: { $ref?: string } }>;
      }
    | undefined,
): CoreAthlete[] {
  return (group?.athletes ?? [])
    .map((row) => ({
      id: athleteIdFromRef(row.athlete?.$ref) ?? "",
      rank: Number(row.rank) || 0,
    }))
    .filter((row) => row.id)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

export async function lookupDepth(player: Player): Promise<DepthSpot | null> {
  const abbr = espnAbbr(player.nflTeam);
  if (!abbr) return null;
  const teamId = ESPN_TEAM_IDS[abbr];
  if (!teamId) return null;

  const offense = await espnOffenseChart(teamId);
  if (!offense) return null;

  const preferred = player.position.toLowerCase();
  const slots = Object.entries(offense.positions ?? {}).sort(([a], [b]) => {
    if (a === preferred) return -1;
    if (b === preferred) return 1;
    return a.localeCompare(b);
  });

  let hit: { slot: string; rank: number; athletes: CoreAthlete[] } | null = null;
  for (const [slot, group] of slots) {
    const athletes = coreAthletes(group);
    const index = athletes.findIndex((athlete) => player.espnId && athlete.id === player.espnId);
    if (index >= 0) {
      hit = { slot, rank: athletes[index].rank || index + 1, athletes };
      break;
    }
  }

  if (!hit && !player.espnId) {
    for (const [slot, group] of slots) {
      if (!/^(qb|rb|te|wr)$/i.test(slot)) continue;
      const athletes = coreAthletes(group).slice(0, 8);
      const names = await Promise.all(athletes.map((athlete) => espnAthleteName(athlete.id)));
      const index = names.findIndex((name) => namesMatch(name, player));
      if (index >= 0) {
        hit = { slot, rank: athletes[index].rank || index + 1, athletes };
        break;
      }
    }
  }
  if (!hit) return null;

  const shown = hit.athletes.slice(0, 8);
  const names = await Promise.all(shown.map((athlete) => espnAthleteName(athlete.id).catch(() => `ESPN ${athlete.id}`)));
  const slot = (offense.positions?.[hit.slot]?.position?.abbreviation || hit.slot).toUpperCase();
  const unit = shown.map((athlete, index) => ({
    rank: athlete.rank || index + 1,
    name: names[index],
    self: athlete.id === player.espnId || namesMatch(names[index], player),
  }));
  const ahead = unit.filter((row) => row.rank < hit!.rank).map((row) => row.name);
  const ordinal =
    hit.rank === 1 ? "starter" : hit.rank === 2 ? "2nd" : hit.rank === 3 ? "3rd" : `${hit.rank}th`;
  return {
    team: abbr,
    chart: offense.name,
    slot,
    rank: hit.rank,
    label: `${abbr} ${slot} (${ordinal})`,
    ahead,
    unit,
  };
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function itemLink(chunk: string): string | null {
  const href = chunk.match(/<link[^>]*href="([^"]+)"/i);
  if (href?.[1]) return decodeXml(href[1]);
  const tagged = chunk.match(/<link>([\s\S]*?)<\/link>/i);
  if (tagged?.[1]?.trim()) return decodeXml(tagged[1].trim());
  const guid = chunk.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
  if (guid?.[1]?.trim()) return decodeXml(guid[1].trim());
  return null;
}

export async function fetchHeadlines(query: string, limit = 6): Promise<NewsItem[]> {
  const cachedKey = `gnews:${query}`;
  const existing = getCached<NewsItem[]>(cachedKey);
  if (existing && existing.length > 0) return existing;

  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  const res = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": BROWSER_UA,
    },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const items: NewsItem[] = [];
  const chunks = xml.split("<item>").slice(1);
  for (const chunk of chunks) {
    const titleMatch = chunk.match(/<title>([\s\S]*?)<\/title>/);
    const urlMatch = itemLink(chunk);
    if (!titleMatch || !urlMatch) continue;
    const title = decodeXml(titleMatch[1].trim());
    const dash = title.lastIndexOf(" - ");
    items.push({
      title: dash > 0 ? title.slice(0, dash) : title,
      source: dash > 0 ? title.slice(dash + 3) : undefined,
      url: urlMatch,
    });
    if (items.length >= limit) break;
  }
  if (items.length > 0) {
    setCached(cachedKey, items, 15 * 60 * 1000);
  }
  return items;
}

export async function fetchEspnHeadlines(player: Player, limit = 6): Promise<NewsItem[]> {
  if (!player.espnId) return fetchHeadlines(newsQuery(player, true), limit);
  const cachedKey = `espnNews:${player.espnId}`;
  const existing = getCached<NewsItem[]>(cachedKey);
  if (existing && existing.length > 0) return existing;

  const data = await espnJson<{
    news?: Array<{
      headline?: string;
      type?: string;
      links?: { web?: { href?: string }; mobile?: { href?: string } };
    }>;
  }>(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${player.espnId}/overview`);
  const items = (data.news ?? [])
    .map((row) => ({
      title: row.headline?.trim() ?? "",
      url: row.links?.web?.href || row.links?.mobile?.href || "",
      source: "ESPN",
    }))
    .filter((row) => row.title && row.url)
    .slice(0, limit);
  if (items.length > 0) setCached(cachedKey, items, 15 * 60 * 1000);
  if (items.length > 0) return items;
  return fetchHeadlines(newsQuery(player, true), limit);
}

export function newsQuery(player: Player, espnOnly = false) {
  const abbr = espnAbbr(player.nflTeam);
  if (espnOnly) return `"${player.name}" site:espn.com`;
  return abbr ? `"${player.name}" ${abbr} NFL` : `"${player.name}" NFL`;
}

export function newsLinks(player: Player) {
  const google = newsQuery(player);
  const espn = newsQuery(player, true);
  return {
    googleNews: `https://news.google.com/search?q=${encodeURIComponent(google)}&hl=en-US&gl=US&ceid=US:en`,
    espnNews: player.espnId
      ? `https://www.espn.com/nfl/player/news/_/id/${player.espnId}`
      : `https://www.espn.com/search/_/q/${encodeURIComponent(player.name)}`,
    espnPlayer: player.espnId
      ? `https://www.espn.com/nfl/player/_/id/${player.espnId}`
      : `https://www.espn.com/search/_/q/${encodeURIComponent(player.name)}`,
    espnSearch: espn,
  };
}
