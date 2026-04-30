-- Add onboarding columns to profiles
alter table public.profiles
  add column if not exists income_range        text,
  add column if not exists spending_weakness   text,
  add column if not exists savings_goal        text,
  add column if not exists onboarding_complete boolean not null default false;
