import { cached } from "./cache.js";
import type { Player } from "./mfl.js";

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

async function espnJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "OldBarLeagueDraftDash/1.0" },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return (await res.json()) as T;
}

async function espnTeamIds(): Promise<Map<string, string>> {
  const entries = await cached("espnTeamIds", 24 * 60 * 60 * 1000, async () => {
    const data = await espnJson<{
      sports?: Array<{
        leagues?: Array<{ teams?: Array<{ team?: { id: string; abbreviation: string } }> }>;
      }>;
    }>("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=40");
    const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
    return teams
      .map((row) => [row.team?.abbreviation ?? "", row.team?.id ?? ""] as [string, string])
      .filter(([abbr, id]) => abbr && id);
  });
  return new Map(Array.isArray(entries) ? entries : []);
}

function namesMatch(espnName: string, player: Player) {
  const a = espnName.toLowerCase().replace(/[^a-z]/g, "");
  const b = player.name.toLowerCase().replace(/[^a-z]/g, "");
  return a === b;
}

type EspnDepthResponse = {
  depthchart?: Array<{
    name: string;
    positions?: Record<
      string,
      {
        position?: { abbreviation?: string };
        athletes?: Array<{ id?: string; displayName?: string }>;
      }
    >;
  }>;
};

async function espnOffenseChart(teamId: string) {
  return cached(`espnDepthChart:${teamId}`, 30 * 60 * 1000, async () => {
    const data = await espnJson<EspnDepthResponse>(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/depthcharts`,
    );
    return (
      data.depthchart?.find((chart) =>
        Object.keys(chart.positions ?? {}).some((key) => /^(qb|rb|te|wr)/i.test(key)),
      ) ?? data.depthchart?.[0] ??
      null
    );
  });
}

export async function lookupDepth(player: Player): Promise<DepthSpot | null> {
  const abbr = espnAbbr(player.nflTeam);
  if (!abbr) return null;
  const teams = await espnTeamIds();
  const teamId = teams.get(abbr);
  if (!teamId) return null;

  const offense = await espnOffenseChart(teamId);
  if (!offense) return null;

  type Hit = { slot: string; rank: number; athletes: Array<{ id?: string; displayName?: string }> };
  let hit: Hit | null = null;
  for (const [slot, group] of Object.entries(offense.positions ?? {})) {
    const athletes = group.athletes ?? [];
    const index = athletes.findIndex((athlete) => {
      if (player.espnId && athlete.id && String(athlete.id) === player.espnId) return true;
      return athlete.displayName ? namesMatch(athlete.displayName, player) : false;
    });
    if (index >= 0) {
      hit = { slot, rank: index + 1, athletes };
      break;
    }
  }
  if (!hit) return null;

  const slot = hit.slot.toUpperCase();
  const unit = hit.athletes.slice(0, 8).map((athlete, index) => ({
    rank: index + 1,
    name: athlete.displayName ?? "Unknown",
    self: index + 1 === hit!.rank,
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

export async function fetchHeadlines(query: string, limit = 6): Promise<NewsItem[]> {
  return cached(`gnews:${query}`, 15 * 60 * 1000, async () => {
    const url = new URL("https://news.google.com/rss/search");
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
    const res = await fetch(url, {
      headers: { Accept: "application/rss+xml", "User-Agent": "OldBarLeagueDraftDash/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const chunks = xml.split("<item>").slice(1);
    for (const chunk of chunks) {
      const titleMatch = chunk.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = chunk.match(/<link>([\s\S]*?)<\/link>/);
      if (!titleMatch || !linkMatch) continue;
      const title = decodeXml(titleMatch[1].trim());
      const dash = title.lastIndexOf(" - ");
      items.push({
        title: dash > 0 ? title.slice(0, dash) : title,
        source: dash > 0 ? title.slice(dash + 3) : undefined,
        url: decodeXml(linkMatch[1].trim()),
      });
      if (items.length >= limit) break;
    }
    return items;
  });
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
    espnNews: `https://www.espn.com/search/_/q/${encodeURIComponent(player.name)}`,
    espnPlayer: player.espnId
      ? `https://www.espn.com/nfl/player/_/id/${player.espnId}`
      : `https://www.espn.com/search/_/q/${encodeURIComponent(player.name)}`,
    espnSearch: espn,
  };
}
