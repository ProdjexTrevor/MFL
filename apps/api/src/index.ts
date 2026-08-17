import "dotenv/config";
import cors from "cors";
import express from "express";
import { handleBootstrap, handleHealth, handleLive } from "./handlers.js";

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

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Draft API on http://localhost:${port}`);
  });
}

export default app;
