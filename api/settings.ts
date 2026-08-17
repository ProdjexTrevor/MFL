import {
  DatabaseUnavailableError,
  getMyFranchiseId,
  setMyFranchiseId,
} from "../apps/api/src/store.js";

type Req = { method?: string; body?: unknown };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
};

export default async function handler(req: Req, res: Res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    if (req.method === "GET") {
      res.status(200).json({ myFranchiseId: await getMyFranchiseId() });
      return;
    }
    const body = (req.body ?? {}) as { myFranchiseId?: string };
    if (req.method === "PUT" && body.myFranchiseId) {
      res.status(200).json({ myFranchiseId: await setMyFranchiseId(body.myFranchiseId) });
      return;
    }
    res.status(400).json({ error: "Invalid settings request" });
  } catch (err) {
    console.error(err);
    const status = err instanceof DatabaseUnavailableError ? 503 : 500;
    res.status(status).json({
      error: err instanceof Error ? err.message : "Settings request failed",
    });
  }
}
