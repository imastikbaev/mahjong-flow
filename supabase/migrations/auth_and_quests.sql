-- =============================================================================
-- Mahjong Flow — Auth sync + Quest engine
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger: sync auth.users → public.users on every new sign-up
-- ---------------------------------------------------------------------------

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
      new.raw_user_meta_data->>'full_name',   -- Google OAuth
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)           -- email fallback
    ),
    null,
    false
  )
  on conflict (id) do nothing;               -- idempotent on re-auth
  return new;
end;
$$;

-- Drop if exists so re-applying this migration is safe
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 2. quests_progress table
-- ---------------------------------------------------------------------------

create table if not exists public.quests_progress (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  quest_id      text        not null,
  target_value  int         not null default 1,
  current_value int         not null default 0,
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


-- ---------------------------------------------------------------------------
-- 3. Row-Level Security — users see only their own quest progress
-- ---------------------------------------------------------------------------

alter table public.quests_progress enable row level security;

drop policy if exists "users_own_quests" on public.quests_progress;
create policy "users_own_quests"
  on public.quests_progress
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 4. Helpful index for the hook's main query pattern
-- ---------------------------------------------------------------------------

create index if not exists quests_progress_user_idx
  on public.quests_progress (user_id, quest_id);
