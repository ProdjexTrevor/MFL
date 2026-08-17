import {
  DatabaseUnavailableError,
  listStarredPlayerIds,
  replaceStarredPlayers,
  setStarredPlayer,
} from "../src/store.js";

type Req = { method?: string; body?: unknown };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
};

function cors(res: Res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function statusOf(err: unknown): number {
  if (err instanceof DatabaseUnavailableError) return 503;
  return 500;
}

export default async function handler(req: Req, res: Res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    if (req.method === "GET") {
      res.status(200).json({ playerIds: await listStarredPlayerIds() });
      return;
    }
    const body = (req.body ?? {}) as { playerId?: string; starred?: boolean; playerIds?: string[] };
    if (req.method === "PUT" && Array.isArray(body.playerIds)) {
      res.status(200).json({ playerIds: await replaceStarredPlayers(body.playerIds) });
      return;
    }
    if (req.method === "POST" && body.playerId && typeof body.starred === "boolean") {
      res.status(200).json({
        playerIds: await setStarredPlayer(body.playerId, body.starred),
      });
      return;
    }
    res.status(400).json({ error: "Invalid stars request" });
  } catch (err) {
    console.error(err);
    res.status(statusOf(err)).json({
      error: err instanceof Error ? err.message : "Stars request failed",
      playerIds: [],
    });
  }
}
