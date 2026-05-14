-- =============================================================================
-- Mahjong Flow — Atomic quest progress increment
-- Apply in: Supabase Dashboard → SQL Editor → Run
-- =============================================================================
--
-- Replaces the client-side read-then-write pattern in useQuests.ts with a
-- single round-trip that holds a row-level lock for the duration of the
-- update, eliminating the race condition that arises when two game events
-- (e.g. pair match + sprint end) fire simultaneously.
--
-- Usage from the browser client:
--   supabase.rpc('increment_quest_progress', {
--     u_id:    '<user uuid>',
--     q_id:    'daily_pairs_50',
--     inc_val: 5,
--   })
--
-- Returns one row: { current_value: int, is_completed: bool }
-- Returns empty if the quest row does not exist or is already completed.
-- =============================================================================

create or replace function public.increment_quest_progress(
  u_id    uuid,
  q_id    text,
  inc_val int
)
returns table (current_value int, is_completed boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  _row     public.quests_progress%rowtype;
  _new_val int;
  _done    boolean;
begin
  -- Lock the target row for the duration of this transaction.
  -- Concurrent calls for the same (user, quest) will queue behind this lock.
  select * into _row
  from   public.quests_progress
  where  quests_progress.user_id  = u_id
    and  quests_progress.quest_id = q_id
  for update;

  -- Row missing or already completed — nothing to do.
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

-- Grant execute to authenticated users only.
-- The function is security definer so it runs as the DB owner, but we
-- restrict who can call it at the RPC level.
revoke execute on function public.increment_quest_progress(uuid, text, int) from public;
grant  execute on function public.increment_quest_progress(uuid, text, int) to authenticated;
