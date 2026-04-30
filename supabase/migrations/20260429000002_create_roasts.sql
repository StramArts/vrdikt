-- roasts: each AI roast generated for a user
create table if not exists public.roasts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  roast_text       text not null,                -- the full AI-generated roast
  spending_data    jsonb,                         -- raw parsed transactions
  personality_type text,                          -- e.g. "The Midnight Snacker"
  total_spent      numeric(12, 2)                 -- total spend across the period
);

-- Indexes for common queries
create index if not exists roasts_user_id_idx      on public.roasts (user_id);
create index if not exists roasts_created_at_idx   on public.roasts (created_at desc);

-- Row-level security
alter table public.roasts enable row level security;

create policy "Users can view their own roasts"
  on public.roasts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own roasts"
  on public.roasts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own roasts"
  on public.roasts for delete
  using (auth.uid() = user_id);
