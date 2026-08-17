import { cachedOrStale } from "./cache.js";
import { buildBootstrap, buildLive, rankedPlayers, type Player } from "./mfl.js";

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
  return cachedOrStale("bootstrapRanks", 10 * 60 * 1000, buildBootstrap);
}

export async function handleLive() {
  const index = await getPlayerIndex();
  return cachedOrStale("live", 10_000, () => buildLive(index));
}
