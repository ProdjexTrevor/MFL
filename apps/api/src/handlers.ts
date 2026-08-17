import { cachedOrStale } from "./cache.js";
import { buildBootstrap, buildLive, rankedPlayers, type Player } from "./mfl.js";
import { fetchHeadlines, lookupDepth, newsLinks, newsQuery } from "./playerCard.js";

let playerIndexPromise: Promise<Map<string, Player>> | null = null;

async function getPlayerIndex(): Promise<Map<string, Player>> {
  if (!playerIndexPromise) {
    playerIndexPromise = rankedPlayers()
      .then((players) => new Map(players.map((player) => [player.id, player])))
      .catch((err) => {
        playerIndexPromise = null;
        throw err;
      });
  }
  return playerIndexPromise;
}

export async function handleHealth() {
  return { status: "ok" };
}

export async function handleBootstrap() {
  return cachedOrStale("bootstrapCard", 10 * 60 * 1000, buildBootstrap);
}

export async function handleLive() {
  const index = await getPlayerIndex();
  return cachedOrStale("live", 10_000, () => buildLive(index));
}

export async function handlePlayer(id: string) {
  const index = await getPlayerIndex();
  const player = index.get(id);
  if (!player) {
    const err = new Error("Player not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  const [depth, google, espn] = await Promise.all([
    lookupDepth(player).catch(() => null),
    fetchHeadlines(newsQuery(player), 6).catch(() => []),
    fetchHeadlines(newsQuery(player, true), 6).catch(() => []),
  ]);
  return {
    player,
    depth,
    news: { google, espn },
    links: newsLinks(player),
  };
}
