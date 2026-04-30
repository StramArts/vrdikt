-- ─── Run this entire file in: Supabase Dashboard → SQL Editor → New query ────
-- It is safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)

-- ── 1. profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  email                text,
  created_at           timestamptz not null default now(),
  spending_personality text,
  streak_count         integer not null default 0,
  tier                 text not null default 'free',
  constraint profiles_user_id_key unique (user_id)
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view their own profile'
  ) then
    create policy "Users can view their own profile"
      on public.profiles for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles for update using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 1b. onboarding columns ────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists income_range        text,
  add column if not exists spending_weakness   text,
  add column if not exists savings_goal        text,
  add column if not exists onboarding_complete boolean not null default false;

-- ── 2. roasts ─────────────────────────────────────────────────────────────────
create table if not exists public.roasts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  roast_text       text not null,
  spending_data    jsonb,
  personality_type text,
  total_spent      numeric(12, 2)
);

create index if not exists roasts_user_id_idx    on public.roasts (user_id);
create index if not exists roasts_created_at_idx on public.roasts (created_at desc);

alter table public.roasts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'roasts' and policyname = 'Users can view their own roasts'
  ) then
    create policy "Users can view their own roasts"
      on public.roasts for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'roasts' and policyname = 'Users can insert their own roasts'
  ) then
    create policy "Users can insert their own roasts"
      on public.roasts for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'roasts' and policyname = 'Users can delete their own roasts'
  ) then
    create policy "Users can delete their own roasts"
      on public.roasts for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ── 3. challenges + challenge_transactions ────────────────────────────────────
-- (paste contents of 20260430000002_challenges.sql here)
