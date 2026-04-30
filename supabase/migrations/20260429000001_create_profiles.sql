-- profiles: one row per user, created automatically on sign-up via trigger
create table if not exists public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  email               text,
  created_at          timestamptz not null default now(),
  spending_personality text,          -- e.g. "impulse buyer", "subscription hoarder"
  streak_count        integer not null default 0,
  tier                text not null default 'free', -- 'free' | 'pro'
  constraint profiles_user_id_key unique (user_id)
);

-- Row-level security
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Auto-create a profile row whenever a new user signs up
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
