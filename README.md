# Old Bar League Draft Dashboard

Live draft board for [Old Bar League](https://www44.myfantasyleague.com/2026/home/49177) (MFL league `49177`). MyFantasyLeague blocks browser CORS, so the React app talks to a small Express proxy.

The default franchise is **The Shove Weasels**.

## Run locally

Needs Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

- App: http://localhost:5173
- API: http://localhost:3001

Copy `apps/api/.env.example` to `apps/api/.env` if you do not already have one. Do not commit API keys.

Starred players and your franchise (The Shove Weasels) persist in Supabase Postgres. Create the tables by running `supabase/migrations/20260817_mfl_draft.sql` in the SQL editor for project `fgcncfzvjfpwcezgmltz`, then put `DATABASE_URL` (transaction pooler, port 6543) in `apps/api/.env` and in Vercel env vars. Use `DIRECT_URL` (session pooler, port 5432) only if you run migrations from a client that needs a session connection.


## Deploy on Vercel

Connect the GitHub repo and leave the **root directory** as the repo root. `vercel.json` builds the React app into root `dist` and exposes `/api/*` as serverless functions. Output Directory should be `dist`.

If the site ever shows `Cannot GET /…`, the project was treated as an Express server. Redeploy after this config so Vercel serves the frontend, not `apps/api` alone.
