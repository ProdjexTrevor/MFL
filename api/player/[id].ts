import { handlePlayer } from "../../apps/api/src/handlers.js";

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
  const raw = req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  const fromPath = String(req.url ?? "").match(/\/player\/([^/?]+)/)?.[1];
  const id = decodeURIComponent(fromQuery || fromPath || "");
  if (!id) {
    res.status(400).json({ error: "Missing player id" });
    return;
  }
  try {
    res.status(200).json(await handlePlayer(id));
  } catch (err) {
    const status = (err as { status?: number }).status === 404 ? 404 : 502;
    console.error(err);
    res.status(status).json({
      error: err instanceof Error ? err.message : "Player lookup failed",
    });
  }
}
