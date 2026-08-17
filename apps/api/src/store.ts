import { leagueId, sql } from "./db.js";

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseUnavailableError";
  }
}

function requireSql() {
  if (!sql) throw new DatabaseUnavailableError();
  return sql;
}

export async function listStarredPlayerIds(): Promise<string[]> {
  const rows = await requireSql()`
    select player_id
    from public.starred_players
    where league_id = ${leagueId()}
    order by created_at asc
  `;
  return rows.map((row) => String(row.player_id));
}

export async function setStarredPlayer(playerId: string, starred: boolean): Promise<string[]> {
  const db = requireSql();
  const league = leagueId();
  if (starred) {
    await db`
      insert into public.starred_players (league_id, player_id)
      values (${league}, ${playerId})
      on conflict (league_id, player_id) do nothing
    `;
  } else {
    await db`
      delete from public.starred_players
      where league_id = ${league} and player_id = ${playerId}
    `;
  }
  return listStarredPlayerIds();
}

export async function replaceStarredPlayers(playerIds: string[]): Promise<string[]> {
  const db = requireSql();
  const league = leagueId();
  const unique = [...new Set(playerIds.filter(Boolean))];
  await db.begin(async (tx) => {
    await tx`delete from public.starred_players where league_id = ${league}`;
    for (const id of unique) {
      await tx`
        insert into public.starred_players (league_id, player_id)
        values (${league}, ${id})
      `;
    }
  });
  return unique;
}

export async function getMyFranchiseId(): Promise<string> {
  const rows = await requireSql()`
    select my_franchise_id
    from public.draft_settings
    where league_id = ${leagueId()}
  `;
  return rows[0] ? String(rows[0].my_franchise_id) : "0001";
}

export async function setMyFranchiseId(franchiseId: string): Promise<string> {
  const db = requireSql();
  const league = leagueId();
  await db`
    insert into public.draft_settings (league_id, my_franchise_id, updated_at)
    values (${league}, ${franchiseId}, now())
    on conflict (league_id) do update
      set my_franchise_id = excluded.my_franchise_id,
          updated_at = now()
  `;
  return franchiseId;
}
