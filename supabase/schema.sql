-- FALKOR portfolio — Supabase schema
--
-- Run this once in your own Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- The whole portfolio (chapters, images, settings, admin) is stored as a single
-- JSONB document. It's a few kilobytes, one photographer edits it, and keeping
-- it as one document means the app's data layer stayed exactly as it was.

create table if not exists public.portfolio_state (
  id         int primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint portfolio_state_singleton check (id = 1)
);

-- RLS on with no policies = no access for the anon/publishable key.
-- The server uses the service_role key, which bypasses RLS. This is what keeps
-- the admin password hash out of reach of the browser.
alter table public.portfolio_state enable row level security;
