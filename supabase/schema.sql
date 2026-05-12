-- =============================================================================
-- Mahjong Flow — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 1. users
-- Extends the built-in auth.users table with game-specific profile fields.
-- id is a FK → auth.users so it is automatically populated on sign-up via a
-- trigger (see bottom of file).
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  nickname   text        not null unique,
  city       text,
  is_pro     boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table  public.users            is 'Public player profiles, one row per auth user.';
comment on column public.users.city       is 'Used for geo-leaderboard filtering.';
comment on column public.users.is_pro     is 'Unlocks detailed stats and custom tile skins.';


-- ---------------------------------------------------------------------------
-- 2. leaderboard
-- One best-score row per (user, date, type).  The UNIQUE constraint means
-- re-submitting a score for the same day/mode UPSERTS rather than duplicates.
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  date           date        not null default current_date,
  time_seconds   integer     not null check (time_seconds > 0),
  score          integer     not null check (score >= 0),
  type           text        not null check (type in ('daily', 'practice')),
  created_at     timestamptz not null default now(),

  -- Enforce one best score per player per day per mode
  unique (user_id, date, type)
);

comment on table  public.leaderboard              is 'Best scores per player per day per game mode.';
comment on column public.leaderboard.time_seconds is 'Wall-clock seconds to clear the board.';
comment on column public.leaderboard.score        is 'Computed as: 10000 - time_seconds * 5 (floor 0).';
comment on column public.leaderboard.type         is 'daily | practice';


-- ---------------------------------------------------------------------------
-- Indexes (Supabase creates a PK index automatically; add query-hot paths)
-- ---------------------------------------------------------------------------
create index if not exists leaderboard_date_type_idx
  on public.leaderboard (date, type);

create index if not exists leaderboard_user_city_idx
  on public.leaderboard (user_id);

-- Composite index used by the "local leaderboard" query
-- (join leaderboard → users filtered by city)
create index if not exists users_city_idx
  on public.users (city);


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users        enable row level security;
alter table public.leaderboard  enable row level security;

-- ── users ──────────────────────────────────────────────────────────────────

-- Everyone can read profiles (needed for leaderboard nickname/city lookups)
create policy "public_read_users"
  on public.users for select
  using (true);

-- A user can only insert their own profile row
create policy "insert_own_profile"
  on public.users for insert
  with check (auth.uid() = id);

-- A user can only update their own profile
create policy "update_own_profile"
  on public.users for update
  using (auth.uid() = id);

-- ── leaderboard ────────────────────────────────────────────────────────────

-- Anyone (including anonymous) can read the leaderboard
create policy "public_read_leaderboard"
  on public.leaderboard for select
  using (true);

-- Authenticated users can insert their own scores
create policy "insert_own_score"
  on public.leaderboard for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update (improve) their own score
create policy "update_own_score"
  on public.leaderboard for update
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Trigger: auto-create a users row on first sign-up
-- Fires AFTER INSERT on auth.users.  nickname defaults to the email prefix;
-- players can change it later from their profile page.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nickname)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nickname',
      split_part(new.email, '@', 1)   -- fallback: email prefix
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
