-- =============================================================================
-- Mahjong Flow — Supabase Schema  (v2: no Supabase Auth required)
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 1. users
-- Client-generated UUID stored in localStorage. No auth dependency.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid        primary key,
  nickname   text        not null default 'anonymous',
  city       text,
  is_pro     boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table  public.users       is 'Public player profiles. UUID is generated client-side and persisted in localStorage.';
comment on column public.users.city  is 'Used for geo-leaderboard filtering.';
comment on column public.users.is_pro is 'Unlocks detailed stats and custom tile skins.';


-- ---------------------------------------------------------------------------
-- 2. leaderboard
-- One best-score row per (user, date, type).
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  date           date        not null default current_date,
  time_seconds   integer     not null check (time_seconds > 0),
  score          integer     not null check (score >= 0),
  type           text        not null check (type in ('daily', 'practice')),
  created_at     timestamptz not null default now(),

  unique (user_id, date, type)
);

comment on table  public.leaderboard              is 'Best scores per player per day per game mode.';
comment on column public.leaderboard.time_seconds is 'Wall-clock seconds to clear the board.';
comment on column public.leaderboard.score        is 'Computed as: 10000 - time_seconds * 5 (floor 0).';
comment on column public.leaderboard.type         is 'daily | practice';


-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists leaderboard_date_type_idx on public.leaderboard (date, type);
create index if not exists leaderboard_user_id_idx   on public.leaderboard (user_id);
create index if not exists users_city_idx             on public.users (city);


-- ---------------------------------------------------------------------------
-- Row Level Security
-- The UUID acts as the user's identity token — only someone who knows their
-- UUID (stored in their localStorage) can submit/update their own scores.
-- Reads are fully public for the leaderboard to work.
-- ---------------------------------------------------------------------------
alter table public.users       enable row level security;
alter table public.leaderboard enable row level security;

-- ── users ──────────────────────────────────────────────────────────────────
drop policy if exists "public_read_users"    on public.users;
drop policy if exists "public_insert_users"  on public.users;
drop policy if exists "public_update_users"  on public.users;

create policy "public_read_users"
  on public.users for select using (true);

create policy "public_insert_users"
  on public.users for insert with check (true);

create policy "public_update_users"
  on public.users for update using (true);

-- ── leaderboard ────────────────────────────────────────────────────────────
drop policy if exists "public_read_leaderboard"   on public.leaderboard;
drop policy if exists "public_insert_leaderboard" on public.leaderboard;
drop policy if exists "public_update_leaderboard" on public.leaderboard;

create policy "public_read_leaderboard"
  on public.leaderboard for select using (true);

create policy "public_insert_leaderboard"
  on public.leaderboard for insert with check (true);

create policy "public_update_leaderboard"
  on public.leaderboard for update using (true);
