import { handlePlayer } from "../src/handlers.js";

function playerId(req: { query?: { id?: string | string[] }; url?: string }) {
  const raw = req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  const fromPath = String(req.url ?? "").match(/\/player\/([^/?]+)/)?.[1];
  return decodeURIComponent(fromQuery || fromPath || "");
}

function errorMessage(err: unknown) {
  if (err instanceof Error && err.message && err.message !== "[object Object]") return err.message;
  if (typeof err === "object" && err && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Player lookup failed";
}

export default async function handler(
  req: { method?: string; query?: { id?: string | string[] }; url?: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (body: unknown) => void; end: () => void };
  },
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const id = playerId(req);
  if (!id) {
    res.status(400).json({ error: "Missing player id" });
    return;
  }
  try {
    res.status(200).json(await handlePlayer(id));
  } catch (err) {
    const status = (err as { status?: number }).status === 404 ? 404 : 502;
    console.error(err);
    res.status(status).json({ error: errorMessage(err) });
  }
}
