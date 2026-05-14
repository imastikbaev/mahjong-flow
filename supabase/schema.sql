-- =============================================================================
-- Mahjong Flow — Production Schema (Auth-integrated)
-- Apply in: Supabase Dashboard → SQL Editor → Run
--
-- This file is the single source of truth for all tables, triggers, RLS
-- policies, and helper functions. It is fully idempotent — safe to re-run.
-- =============================================================================

create extension if not exists "uuid-ossp";


-- =============================================================================
-- 1. public.users
-- Mirrors auth.users. Populated automatically by handle_new_user() trigger.
-- id references auth.users(id) so the row is always tied to a real session.
-- =============================================================================

create table if not exists public.users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  nickname   text        not null,
  city       text,
  is_pro     boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table  public.users          is 'Player profiles, one row per auth.users entry.';
comment on column public.users.city     is 'Used for geo-scoped leaderboard queries.';
comment on column public.users.is_pro   is 'Unlocks Sprint mode, Undo, AI Coach, and Elemental skin.';


-- =============================================================================
-- 2. Trigger: sync auth.users → public.users on sign-up
-- Runs as security definer so it can INSERT into public.users regardless of RLS.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, nickname, city, is_pro)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',  -- Google OAuth display name
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)          -- email/password fallback
    ),
    null,
    false
  )
  on conflict (id) do nothing;  -- idempotent on re-auth or token refresh
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- 3. public.leaderboard
-- One personal-best row per (user_id, date, type).
-- Score is upserted — only the best score for a given day survives.
-- =============================================================================

create table if not exists public.leaderboard (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  date         date        not null default current_date,
  time_seconds integer     not null check (time_seconds > 0),
  score        integer     not null check (score >= 0),
  type         text        not null check (type in ('daily', 'practice')),
  created_at   timestamptz not null default now(),

  unique (user_id, date, type)
);

comment on column public.leaderboard.time_seconds is 'Wall-clock seconds to clear the board.';
comment on column public.leaderboard.score        is '10000 - time_seconds * 5 (floor 0) for classic; pairs*100 + remaining_seconds*10 for sprint.';
comment on column public.leaderboard.type         is 'daily | practice';


-- =============================================================================
-- 4. public.quests_progress
-- Tracks per-user progress toward each quest definition.
-- Rows are reset client-side when expires_at < now(); the atomic RPC below
-- handles concurrent increment safely.
-- =============================================================================

create table if not exists public.quests_progress (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  quest_id      text        not null,
  target_value  integer     not null default 1,
  current_value integer     not null default 0,
  expires_at    timestamptz not null,
  is_completed  boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, quest_id)
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quests_progress_updated_at on public.quests_progress;
create trigger quests_progress_updated_at
  before update on public.quests_progress
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 5. Row-Level Security
-- =============================================================================

alter table public.users           enable row level security;
alter table public.leaderboard     enable row level security;
alter table public.quests_progress enable row level security;

-- ── public.users ─────────────────────────────────────────────────────────────
-- Anyone can read profiles (needed for leaderboard nickname/city display).
-- Only the authenticated owner can write their own row.

drop policy if exists "users_public_read" on public.users;
drop policy if exists "users_own_write"   on public.users;

create policy "users_public_read"
  on public.users for select
  using (true);

create policy "users_own_write"
  on public.users for all
  using     (auth.uid() = id)
  with check (auth.uid() = id);

-- ── public.leaderboard ───────────────────────────────────────────────────────
-- Public reads (global ranking). INSERT and UPDATE restricted to own user_id
-- so no one can submit scores on behalf of another player.

drop policy if exists "leaderboard_public_read"  on public.leaderboard;
drop policy if exists "leaderboard_own_insert"   on public.leaderboard;
drop policy if exists "leaderboard_own_update"   on public.leaderboard;

create policy "leaderboard_public_read"
  on public.leaderboard for select
  using (true);

create policy "leaderboard_own_insert"
  on public.leaderboard for insert
  with check (auth.uid() = user_id);

create policy "leaderboard_own_update"
  on public.leaderboard for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── public.quests_progress ───────────────────────────────────────────────────
-- Full access restricted to the owning user.

drop policy if exists "quests_own" on public.quests_progress;

create policy "quests_own"
  on public.quests_progress for all
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- 6. Atomic quest progress increment
--
-- Replaces the client-side read-then-write pattern with a single database
-- round-trip. FOR UPDATE acquires a row-level lock for the duration of the
-- transaction, eliminating the TOCTOU race when two game events fire in the
-- same request cycle (e.g. pair match + sprint timeout).
--
-- Returns one row: { current_value int, is_completed bool }
-- Returns empty if the row is missing or already completed.
-- =============================================================================

create or replace function public.increment_quest_progress(
  u_id    uuid,
  q_id    text,
  inc_val integer
)
returns table (current_value integer, is_completed boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  _row     public.quests_progress%rowtype;
  _new_val integer;
  _done    boolean;
begin
  select * into _row
  from   public.quests_progress
  where  quests_progress.user_id  = u_id
    and  quests_progress.quest_id = q_id
  for update;

  if not found then
    return;
  end if;

  if _row.is_completed then
    return query select _row.current_value, _row.is_completed;
    return;
  end if;

  _new_val := least(_row.current_value + inc_val, _row.target_value);
  _done    := _new_val >= _row.target_value;

  update public.quests_progress
  set    current_value = _new_val,
         is_completed  = _done
  where  quests_progress.user_id  = u_id
    and  quests_progress.quest_id = q_id;

  return query select _new_val, _done;
end;
$$;

-- Restrict RPC access to authenticated sessions only.
revoke execute on function public.increment_quest_progress(uuid, text, integer) from public;
grant  execute on function public.increment_quest_progress(uuid, text, integer) to authenticated;


-- =============================================================================
-- 7. Indexes
-- =============================================================================

create index if not exists leaderboard_date_score_idx  on public.leaderboard     (date, score desc);
create index if not exists leaderboard_user_idx        on public.leaderboard     (user_id);
create index if not exists users_city_idx              on public.users            (city);
create index if not exists quests_user_quest_idx       on public.quests_progress  (user_id, quest_id);
