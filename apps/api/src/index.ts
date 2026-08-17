import "dotenv/config";
import cors from "cors";
import express from "express";
import { cached, getStale } from "./cache.js";
import { buildBootstrap, buildLive, fetchPlayers, fetchAdp, type Player } from "./mfl.js";

const app = express();
app.use(cors());
app.use(express.json());

let playerIndexPromise: Promise<Map<string, Player>> | null = null;

async function getPlayerIndex(): Promise<Map<string, Player>> {
  if (!playerIndexPromise) {
    playerIndexPromise = (async () => {
      const [players, adp] = await Promise.all([fetchPlayers(), fetchAdp()]);
      const map = new Map<string, Player>();
      for (const p of players) {
        const a = adp.get(p.id);
        map.set(p.id, a ? { ...p, adpRank: a.rank, adp: a.adp } : p);
      }
      return map;
    })();
  }
  return playerIndexPromise;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/bootstrap", async (_req, res) => {
  try {
    const payload = await cached("bootstrap", 10 * 60 * 1000, buildBootstrap);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Bootstrap failed" });
  }
});

app.get("/api/live", async (_req, res) => {
  try {
    const index = await getPlayerIndex();
    try {
      const payload = await cached("live", 4_000, () => buildLive(index));
      res.json(payload);
    } catch (err) {
      const stale = getStale<unknown>("live");
      if (stale) {
        res.json(stale);
        return;
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Live fetch failed" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Draft API on http://localhost:${port}`);
});
