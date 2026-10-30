-- Applied to project pcddakllvoebaaswsspu on 2026-10-30. Kept here for reference / re-creating the database.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generic, module-based records (notes, tasks, recipes, books, ideas, goals, workout programs...)
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module text not null check (char_length(module) between 1 and 40),
  kind text not null check (char_length(kind) between 1 and 40),
  title text not null default '' check (char_length(title) <= 500),
  body text check (char_length(body) <= 50000),
  data jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  status text check (char_length(status) <= 40),
  rating smallint check (rating between 0 and 10),
  favorite boolean not null default false,
  pinned boolean not null default false,
  due_at timestamptz,
  remind_at timestamptz,
  completed_at timestamptz,
  parent_id uuid references public.items(id) on delete cascade,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_user_module_kind_idx on public.items (user_id, module, kind);
create index items_user_due_idx on public.items (user_id, due_at) where due_at is not null;
create index items_parent_idx on public.items (parent_id) where parent_id is not null;

-- Numeric time-series (water, protein, pages, workout sets, savings...)
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  item_id uuid references public.items(id) on delete cascade,
  amount numeric not null default 0,
  unit text check (char_length(unit) <= 20),
  data jsonb not null default '{}'::jsonb,
  day date not null default current_date,
  logged_at timestamptz not null default now()
);
create index logs_user_kind_day_idx on public.logs (user_id, kind, day);
create index logs_item_idx on public.logs (item_id) where item_id is not null;

-- Important dates / news: global (user_id null) or personal
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_key text not null unique,
  kind text not null,
  title text not null,
  body text,
  url text,
  starts_on date not null,
  ends_on date,
  importance smallint not null default 1,
  created_at timestamptz not null default now()
);
create index alerts_starts_idx on public.alerts (starts_on);
create index alerts_user_idx on public.alerts (user_id);

-- MCP personal tokens (only SHA-256 hash stored)
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique,
  token_prefix text not null,
  scopes text[] not null default '{read}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_tokens_user_idx on public.api_tokens (user_id);

create table public.sync_state (key text primary key, ran_at timestamptz not null default now(), info jsonb);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.logs enable row level security;
alter table public.alerts enable row level security;
alter table public.api_tokens enable row level security;
alter table public.sync_state enable row level security;

create policy "own profile select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own items select" on public.items for select to authenticated using ((select auth.uid()) = user_id);
create policy "own items insert" on public.items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own items update" on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own items delete" on public.items for delete to authenticated using ((select auth.uid()) = user_id);
create policy "own logs select" on public.logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "own logs insert" on public.logs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own logs update" on public.logs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own logs delete" on public.logs for delete to authenticated using ((select auth.uid()) = user_id);
create policy "global or own alerts select" on public.alerts for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "own alerts insert" on public.alerts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own alerts delete" on public.alerts for delete to authenticated using ((select auth.uid()) = user_id);
create policy "own tokens select" on public.api_tokens for select to authenticated using ((select auth.uid()) = user_id);
create policy "own tokens update" on public.api_tokens for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tokens delete" on public.api_tokens for delete to authenticated using ((select auth.uid()) = user_id);

revoke update (token_hash, token_prefix, user_id) on public.api_tokens from authenticated;
revoke all on public.sync_state from anon, authenticated;

create or replace function public.create_api_token(p_name text, p_scopes text[] default '{read}')
returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_token text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not (p_scopes <@ array['read','write']::text[]) then raise exception 'invalid scope'; end if;
  if (select count(*) from public.api_tokens where user_id = v_uid and revoked_at is null) >= 10 then raise exception 'token limit reached'; end if;
  v_token := 'hyt_' || encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.api_tokens (user_id, name, token_hash, token_prefix, scopes)
  values (v_uid, left(p_name, 60), encode(extensions.digest(v_token, 'sha256'), 'hex'), left(v_token, 10), p_scopes);
  return v_token;
end; $$;
revoke execute on function public.create_api_token(text, text[]) from public, anon;
grant execute on function public.create_api_token(text, text[]) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760, array['image/png','image/jpeg','image/webp','image/heic','image/gif'])
on conflict (id) do nothing;
create policy "own files select" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
