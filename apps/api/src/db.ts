import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), "../.env") });

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export const sql = createClient();

export function leagueId(): string {
  return process.env.MFL_LEAGUE_ID ?? "49177";
}
