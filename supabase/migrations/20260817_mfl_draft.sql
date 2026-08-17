-- Old Bar League draft dashboard (MFL 49177)
-- Run in the Supabase SQL editor for project fgcncfzvjfpwcezgmltz
-- (Cursor is currently connected to a different Supabase project.)

create table if not exists public.starred_players (
  league_id text not null,
  player_id text not null,
  created_at timestamptz not null default now(),
  primary key (league_id, player_id)
);

create table if not exists public.draft_settings (
  league_id text primary key,
  my_franchise_id text not null default '0001',
  updated_at timestamptz not null default now()
);

create index if not exists starred_players_league_id_idx
  on public.starred_players (league_id);

alter table public.starred_players enable row level security;
alter table public.draft_settings enable row level security;

insert into public.draft_settings (league_id, my_franchise_id)
values ('49177', '0001')
on conflict (league_id) do nothing;
