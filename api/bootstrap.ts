import { handleBootstrap } from "../apps/api/src/handlers.js";

export default async function handler(
  req: { method?: string },
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
  try {
    res.status(200).json(await handleBootstrap());
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "Bootstrap failed",
    });
  }
}
