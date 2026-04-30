-- ── challenges ────────────────────────────────────────────────────────────────
create table if not exists public.challenges (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  month          text not null,
  category       text not null,
  goal           text not null,
  target_amount  numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  status         text not null default 'active',
  created_at     timestamptz not null default now()
);

create index if not exists challenges_user_id_idx on public.challenges (user_id);

alter table public.challenges enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'challenges' and policyname = 'Users can view their own challenges') then
    create policy "Users can view their own challenges"
      on public.challenges for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'challenges' and policyname = 'Users can insert their own challenges') then
    create policy "Users can insert their own challenges"
      on public.challenges for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'challenges' and policyname = 'Users can update their own challenges') then
    create policy "Users can update their own challenges"
      on public.challenges for update using (auth.uid() = user_id);
  end if;
end $$;

-- ── challenge_transactions ────────────────────────────────────────────────────
create table if not exists public.challenge_transactions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount       numeric(12,2) not null,
  description  text,
  created_at   timestamptz not null default now()
);

create index if not exists challenge_txns_challenge_id_idx on public.challenge_transactions (challenge_id);
create index if not exists challenge_txns_user_id_idx      on public.challenge_transactions (user_id);

alter table public.challenge_transactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'challenge_transactions' and policyname = 'Users can view their own challenge transactions') then
    create policy "Users can view their own challenge transactions"
      on public.challenge_transactions for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'challenge_transactions' and policyname = 'Users can insert their own challenge transactions') then
    create policy "Users can insert their own challenge transactions"
      on public.challenge_transactions for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'challenge_transactions' and policyname = 'Users can delete their own challenge transactions') then
    create policy "Users can delete their own challenge transactions"
      on public.challenge_transactions for delete using (auth.uid() = user_id);
  end if;
end $$;
