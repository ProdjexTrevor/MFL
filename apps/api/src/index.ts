import "dotenv/config";
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBootstrap, handleHealth, handleLive, handlePlayer } from "./handlers.js";
import {
  DatabaseUnavailableError,
  getMyFranchiseId,
  listStarredPlayerIds,
  replaceStarredPlayers,
  setMyFranchiseId,
  setStarredPlayer,
} from "./store.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json(await handleHealth());
});

app.get("/api/health", async (_req, res) => {
  res.json(await handleHealth());
});

app.get("/api/bootstrap", async (_req, res) => {
  try {
    res.json(await handleBootstrap());
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Bootstrap failed" });
  }
});

app.get("/api/live", async (_req, res) => {
  try {
    res.json(await handleLive());
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Live fetch failed" });
  }
});

app.get("/api/player/:id", async (req, res) => {
  try {
    res.json(await handlePlayer(String(req.params.id)));
  } catch (err) {
    const status = (err as { status?: number }).status === 404 ? 404 : 502;
    console.error(err);
    res.status(status).json({
      error: err instanceof Error ? err.message : "Player lookup failed",
    });
  }
});

app.get("/api/player", async (req, res) => {
  try {
    const id = String(req.query.id ?? "");
    if (!id) {
      res.status(400).json({ error: "Missing player id" });
      return;
    }
    res.json(await handlePlayer(id));
  } catch (err) {
    const status = (err as { status?: number }).status === 404 ? 404 : 502;
    console.error(err);
    res.status(status).json({
      error: err instanceof Error ? err.message : "Player lookup failed",
    });
  }
});

app.get("/api/stars", async (_req, res) => {
  try {
    res.json({ playerIds: await listStarredPlayerIds() });
  } catch (err) {
    const status = err instanceof DatabaseUnavailableError ? 503 : 500;
    res.status(status).json({
      error: err instanceof Error ? err.message : "Stars request failed",
      playerIds: [],
    });
  }
});

app.post("/api/stars", async (req, res) => {
  try {
    const { playerId, starred } = req.body ?? {};
    if (!playerId || typeof starred !== "boolean") {
      res.status(400).json({ error: "Invalid stars request" });
      return;
    }
    res.json({ playerIds: await setStarredPlayer(String(playerId), starred) });
  } catch (err) {
    const status = err instanceof DatabaseUnavailableError ? 503 : 500;
    res.status(status).json({ error: err instanceof Error ? err.message : "Stars request failed" });
  }
});

app.put("/api/stars", async (req, res) => {
  try {
    const { playerIds } = req.body ?? {};
    if (!Array.isArray(playerIds)) {
      res.status(400).json({ error: "Invalid stars request" });
      return;
    }
    res.json({ playerIds: await replaceStarredPlayers(playerIds.map(String)) });
  } catch (err) {
    const status = err instanceof DatabaseUnavailableError ? 503 : 500;
    res.status(status).json({ error: err instanceof Error ? err.message : "Stars request failed" });
  }
});

app.get("/api/settings", async (_req, res) => {
  try {
    res.json({ myFranchiseId: await getMyFranchiseId() });
  } catch (err) {
    const status = err instanceof DatabaseUnavailableError ? 503 : 500;
    res.status(status).json({ error: err instanceof Error ? err.message : "Settings request failed" });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { myFranchiseId } = req.body ?? {};
    if (!myFranchiseId) {
      res.status(400).json({ error: "Invalid settings request" });
      return;
    }
    res.json({ myFranchiseId: await setMyFranchiseId(String(myFranchiseId)) });
  } catch (err) {
    const status = err instanceof DatabaseUnavailableError ? 503 : 500;
    res.status(status).json({ error: err instanceof Error ? err.message : "Settings request failed" });
  }
});

function resolveWebDist(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../dist"),
    join(here, "../../dist"),
    join(here, "../../apps/frontend/dist"),
  ];
  return candidates.find((dir) => existsSync(join(dir, "index.html"))) ?? null;
}

const webDist = resolveWebDist();
if (webDist) {
  app.use(express.static(webDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api") || req.path === "/health") {
      next();
      return;
    }
    res.sendFile(join(webDist, "index.html"));
  });
}

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Draft API on http://localhost:${port}`);
  });
}

export default app;
