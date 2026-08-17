import { cachedOrStale } from "./cache.js";
import { buildBootstrap, buildLive, fetchAdp, fetchPlayers, type Player } from "./mfl.js";

let playerIndexPromise: Promise<Map<string, Player>> | null = null;

async function getPlayerIndex(): Promise<Map<string, Player>> {
  if (!playerIndexPromise) {
    playerIndexPromise = (async () => {
      const players = await fetchPlayers();
      const adp = await fetchAdp();
      const map = new Map<string, Player>();
      for (const p of players) {
        const a = adp.get(p.id);
        map.set(p.id, a ? { ...p, adpRank: a.rank, adp: a.adp } : p);
      }
      return map;
    })().catch((err) => {
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
  return cachedOrStale("bootstrap", 10 * 60 * 1000, buildBootstrap);
}

export async function handleLive() {
  const index = await getPlayerIndex();
  return cachedOrStale("live", 10_000, () => buildLive(index));
}
