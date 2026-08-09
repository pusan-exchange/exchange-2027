-- ─────────────────────────────────────────────────────────────
-- Supabase schema for the exchange-filter app
-- Run in Supabase → SQL Editor (or `supabase db push`).
-- Provides anonymous search-log collection + operator-only retrieval.
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

-- 1) Anonymous search logs (no personal data — searcher_id is a random per-browser UUID)
create table if not exists public.search_logs (
  id           bigint generated always as identity primary key,
  searcher_id  text        not null,
  filters      jsonb       not null default '{}'::jsonb,
  result_count int         not null default 0,
  result_names jsonb       not null default '[]'::jsonb,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index if not exists search_logs_searcher_idx on public.search_logs(searcher_id);
create index if not exists search_logs_created_idx  on public.search_logs(created_at desc);

-- 2) Row Level Security: anonymous clients may INSERT (collect) but never SELECT.
--    → A public (publishable) key cannot read anyone's logs directly.
alter table public.search_logs enable row level security;
drop policy if exists "anon can insert logs" on public.search_logs;
create policy "anon can insert logs" on public.search_logs
  for insert to anon, authenticated with check (true);
grant insert on public.search_logs to anon, authenticated;

-- 3) Operator token, stored as a bcrypt hash in a private schema (not exposed by the API).
create schema if not exists private;
create table if not exists private.app_config (key text primary key, value text not null);
insert into private.app_config(key, value)
values ('operator_pass', crypt('CHANGE_ME_TO_A_STRONG_RANDOM_TOKEN', gen_salt('bf')))
on conflict (key) do nothing;
-- To rotate later:
--   update private.app_config set value = crypt('<new token>', gen_salt('bf')) where key='operator_pass';

-- 4) Operator RPCs — password-gated (bcrypt compare). Called by admin/fetch-logs.mjs.
create or replace function public.admin_get_logs(pass text)
returns setof public.search_logs
language plpgsql security definer set search_path = public, private, extensions as $$
declare h text;
begin
  select value into h from private.app_config where key='operator_pass';
  if pass is null or h is null or crypt(pass, h) <> h then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  return query select * from public.search_logs order by created_at desc;
end; $$;

create or replace function public.admin_clear_logs(pass text)
returns int language plpgsql security definer set search_path = public, private, extensions as $$
declare h text; n int;
begin
  select value into h from private.app_config where key='operator_pass';
  if pass is null or h is null or crypt(pass, h) <> h then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  delete from public.search_logs; get diagnostics n = row_count; return n;
end; $$;

create or replace function public.admin_delete_searcher(pass text, sid text)
returns int language plpgsql security definer set search_path = public, private, extensions as $$
declare h text; n int;
begin
  select value into h from private.app_config where key='operator_pass';
  if pass is null or h is null or crypt(pass, h) <> h then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  delete from public.search_logs where searcher_id = sid; get diagnostics n = row_count; return n;
end; $$;

create or replace function public.admin_set_pass(pass text, new_pass text)
returns boolean language plpgsql security definer set search_path = public, private, extensions as $$
declare h text;
begin
  select value into h from private.app_config where key='operator_pass';
  if pass is null or h is null or crypt(pass, h) <> h then
    raise exception 'unauthorized' using errcode='28000';
  end if;
  if new_pass is null or length(new_pass) < 8 then
    raise exception 'new password too short (min 8)';
  end if;
  update private.app_config set value = crypt(new_pass, gen_salt('bf')) where key='operator_pass';
  return true;
end; $$;

grant execute on function public.admin_get_logs(text)              to anon, authenticated;
grant execute on function public.admin_clear_logs(text)            to anon, authenticated;
grant execute on function public.admin_delete_searcher(text, text) to anon, authenticated;
grant execute on function public.admin_set_pass(text, text)        to anon, authenticated;
