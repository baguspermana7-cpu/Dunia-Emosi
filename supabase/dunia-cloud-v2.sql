-- ============================================================================
-- Dunia Emosi · Cloud/Account schema v2 (robust, scalable)
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run. Idempotent.
--
-- Concept: portable ACCOUNT-CODE (no email/PII). Client uses anonymous auth only
-- so the anon key may call RPCs; the real identity is `account_code`. All table
-- access goes through SECURITY DEFINER RPCs (validated + clamped server-side) —
-- the tables themselves DENY all direct client access (RLS on, no policies).
-- service_role/secret keys are NEVER needed in the app; only URL + anon key.
-- ============================================================================

-- ---- extensions ----
create extension if not exists pgcrypto;   -- gen_random_uuid / gen_random_bytes

-- ---- tables ----
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  account_code  text unique not null,
  display_name  text not null default 'Pemain',
  created_by    uuid,                        -- the anon uid that created it (info only)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.saves (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  game           text not null,                    -- 'math' | 'gym' | 'train' | 'shared' ...
  slot           smallint not null default 1 check (slot between 1 and 7),
  schema_version int not null default 1,
  data           jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  unique (profile_id, game, slot)
);
create index if not exists saves_profile_game_idx on public.saves (profile_id, game);

create table if not exists public.scores (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null default 'Pemain',
  game        text not null,
  metric      text not null,                        -- 'trophies' | 'stars' ...
  value       int  not null default 0,
  updated_at  timestamptz not null default now(),
  unique (profile_id, game, metric)
);
-- scalable leaderboard read: top-N by (game, metric) uses this index directly
create index if not exists scores_board_idx on public.scores (game, metric, value desc);

-- ---- RLS: enable, NO policies → direct client access DENIED. RPCs (definer) bypass. ----
alter table public.profiles enable row level security;
alter table public.saves    enable row level security;
alter table public.scores   enable row level security;

-- ============================================================================
-- RPCs — all SECURITY DEFINER, search_path pinned, granted to anon+authenticated.
-- ============================================================================

-- unique short code like DUNIA-4F7K-9QAX (unambiguous alphabet, no 0/O/1/I)
create or replace function public._gen_code () returns text
language plpgsql as $$
declare
  alpha text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code  text;
  i int;
begin
  loop
    code := 'DUNIA-';
    for i in 1..4 loop code := code || substr(alpha, 1 + floor(random()*length(alpha))::int, 1); end loop;
    code := code || '-';
    for i in 1..4 loop code := code || substr(alpha, 1 + floor(random()*length(alpha))::int, 1); end loop;
    exit when not exists (select 1 from public.profiles where account_code = code);
  end loop;
  return code;
end $$;

create or replace function public.create_account (p_name text default 'Pemain')
returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  c := public._gen_code();
  insert into public.profiles (account_code, display_name, created_by)
  values (c, coalesce(nullif(trim(p_name), ''), 'Pemain'), auth.uid());
  return c;
end $$;

create or replace function public.claim_account (p_code text)
returns table (exists boolean, display_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select true, pr.display_name from public.profiles pr where pr.account_code = upper(trim(p_code))
    union all select false, null::text
    limit 1;
end $$;

create or replace function public.cloud_push (
  p_code text, p_game text, p_slot int, p_version int, p_data jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from public.profiles where account_code = upper(trim(p_code));
  if pid is null then return false; end if;
  if p_data is null or pg_column_size(p_data) > 262144 then return false; end if;  -- 256KB cap
  insert into public.saves (profile_id, game, slot, schema_version, data, updated_at)
  values (pid, p_game, greatest(1, least(7, coalesce(p_slot,1))), coalesce(p_version,1), p_data, now())
  on conflict (profile_id, game, slot)
  do update set data = excluded.data, schema_version = excluded.schema_version, updated_at = now();
  update public.profiles set updated_at = now() where id = pid;
  return true;
end $$;

create or replace function public.cloud_pull (p_code text, p_game text, p_slot int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid; d jsonb;
begin
  select id into pid from public.profiles where account_code = upper(trim(p_code));
  if pid is null then return null; end if;
  select data into d from public.saves
    where profile_id = pid and game = p_game and slot = greatest(1, least(7, coalesce(p_slot,1)));
  return d;
end $$;

create or replace function public.submit_score (
  p_code text, p_game text, p_metric text, p_value int, p_name text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare pid uuid; v int;
begin
  select id into pid from public.profiles where account_code = upper(trim(p_code));
  if pid is null then return false; end if;
  v := greatest(0, least(1000000, coalesce(p_value, 0)));   -- clamp (anti-cheat)
  insert into public.scores (profile_id, name, game, metric, value, updated_at)
  values (pid, coalesce(nullif(trim(p_name), ''), 'Pemain'), p_game, p_metric, v, now())
  on conflict (profile_id, game, metric)
  do update set value = greatest(public.scores.value, excluded.value),   -- high-score only
                name = excluded.name, updated_at = now();
  return true;
end $$;

create or replace function public.leaderboard (p_game text, p_metric text, p_limit int default 50)
returns table (name text, value int, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select name, value, updated_at from public.scores
  where game = p_game and metric = p_metric
  order by value desc, updated_at asc
  limit greatest(1, least(200, coalesce(p_limit, 50)));
$$;

-- ---- grants: expose ONLY the RPCs to the anon key (tables stay locked) ----
revoke all on function public._gen_code() from public;
grant execute on function
  public.create_account(text),
  public.claim_account(text),
  public.cloud_push(text,text,int,int,jsonb),
  public.cloud_pull(text,text,int),
  public.submit_score(text,text,text,int,text),
  public.leaderboard(text,text,int)
to anon, authenticated;

-- ============================================================================
-- (Optional) MIGRATION from the old math_players table → v2. Safe to skip
-- (device will re-sync). Keeps math_players intact for rollback.
-- ============================================================================
-- do $$
-- declare r record; c text;
-- begin
--   for r in select owner, slot, name, data from public.math_players loop
--     c := public._gen_code();
--     insert into public.profiles (account_code, display_name, created_by)
--       values (c, coalesce(r.name,'Pemain'), r.owner);
--     insert into public.saves (profile_id, game, slot, data)
--       select id, 'math', least(7,greatest(1,r.slot)), coalesce(r.data->'kv','{}'::jsonb)
--       from public.profiles where account_code = c;
--   end loop;
-- end $$;

-- Done. In the app: keep the Anonymous provider ON (Auth → Providers). The client
-- calls these RPCs with the anon key + an account_code; no other setup needed.
