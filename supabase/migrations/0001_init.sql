-- ============================================================================
-- Widgetly — initial schema (waitlist + tool suggestions)
-- Migration: 0001_init.sql
-- Target:    Supabase Postgres (any modern version, 15+ recommended)
--
-- Run via one of:
--   • Supabase dashboard → SQL editor (paste + Run)
--   • supabase db push  (if you have the Supabase CLI linked to this project)
--   • psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
--
-- Idempotent: safe to re-run. Uses `if not exists` and `drop ... if exists`
-- only where a re-run would otherwise fail. This means a CI can apply it on
-- every deploy without coordination.
-- ============================================================================

-- Case-insensitive email matching. citext ships with Postgres contrib
-- and is enabled by default on Supabase projects; the `if not exists`
-- keeps this re-runnable on projects that already have it on.
create extension if not exists citext;


-- ----------------------------------------------------------------------------
-- waitlist: one row per email signup. Position is monotonically increasing
-- via a dedicated sequence, so the user-visible "you're #N" is durable and
-- ordered even if some signups are deleted/aborted mid-flow.
-- ----------------------------------------------------------------------------
create sequence if not exists public.waitlist_position_seq;

create table if not exists public.waitlist (
  id          bigint       primary key default nextval('public.waitlist_position_seq'::regclass),
  email       citext       not null unique,
  locale      text         not null default 'en',
  referrer    text,
  user_agent  text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  ip_hash     text,                       -- store a SHA-256 of the IP, never the raw IP
  position    bigint,                     -- denormalized from id for cheap reads
  created_at  timestamptz  not null default now()
);

-- Keep the denormalized position column in sync with the primary key.
-- On insert, the sequence advances and we mirror the value into `position`.
create or replace function public.waitlist_set_position() returns trigger
language plpgsql as $$
begin
  if new.position is null then
    new.position := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists waitlist_set_position_trg on public.waitlist;
create trigger waitlist_set_position_trg
  before insert on public.waitlist
  for each row execute function public.waitlist_set_position();

create index if not exists waitlist_position_idx on public.waitlist (position);
create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);


-- ----------------------------------------------------------------------------
-- suggestions: tool suggestions from the /suggest page. The id is the
-- server-minted "sg_..." string already produced by `generateId("sg")` in the
-- API route, so we keep the same id end-to-end (no need to translate between
-- bigserial and our human-readable ticket style).
-- ----------------------------------------------------------------------------
create table if not exists public.suggestions (
  id          text         primary key,         -- e.g. "sg_a1b2c3d4e5f6"
  slug        text         not null unique,
  name        text         not null,
  pitch       text         not null,
  description text,
  contact     text,                             -- optional email/handle
  locale      text         not null default 'en',
  vote_count  integer      not null default 0,
  status      text         not null default 'pending_review',
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- Allowed status values. Validated at the DB layer so a stray write can't
-- put a row into a typo state.
alter table public.suggestions
  drop constraint if exists suggestions_status_check;
alter table public.suggestions
  add constraint suggestions_status_check
  check (status in ('pending_review', 'in_progress', 'shipped', 'declined'));

create index if not exists suggestions_status_idx on public.suggestions (status);
create index if not exists suggestions_vote_count_idx on public.suggestions (vote_count desc, created_at desc);
create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);

-- Bump updated_at on row write.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists suggestions_touch_updated_at_trg on public.suggestions;
create trigger suggestions_touch_updated_at_trg
  before update on public.suggestions
  for each row execute function public.touch_updated_at();


-- ----------------------------------------------------------------------------
-- Public leaderboard view: powers the "Top requests" widget on /suggest.
-- Excludes declined items. Stable ordering: votes desc, then newest first
-- as a tiebreaker.
-- ----------------------------------------------------------------------------
create or replace view public.top_suggestions as
  select id, slug, name, pitch, vote_count, status, created_at
  from public.suggestions
  where status in ('pending_review', 'in_progress', 'shipped')
  order by vote_count desc, created_at desc
  limit 50;


-- ----------------------------------------------------------------------------
-- Row Level Security.
--
-- Design intent: ALL writes go through the Next.js API routes (which use
-- the service role key, bypassing RLS). The browser never gets a key that
-- can read or write. So we enable RLS but allow zero public policies —
-- effectively: the anon and authenticated roles get nothing, the service
-- role gets everything by virtue of `bypassing rls`.
--
-- This is defense-in-depth: if a route ever leaks the service role key,
-- or if a future contributor writes a client-side insert "for speed",
-- the RLS is the second wall.
-- ----------------------------------------------------------------------------
alter table public.waitlist    enable row level security;
alter table public.suggestions enable row level security;

-- Intentionally no `create policy` statements for anon / authenticated.
-- If you later want a public leaderboard read path, add:
--   create policy "public read top_suggestions" on public.suggestions
--     for select to anon, authenticated using (true);
--   create policy "public read top_suggestions view" on public.top_suggestions
--     for select to anon, authenticated using (true);


-- ----------------------------------------------------------------------------
-- (Optional) helper RPC: increment vote_count atomically. Not used by the
-- current API (we'd add it when we wire up voting), but it's here so the
-- schema is forward-compatible.
-- ----------------------------------------------------------------------------
create or replace function public.increment_suggestion_vote(p_slug text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.suggestions
     set vote_count = vote_count + 1
   where slug = p_slug
   returning vote_count into new_count;
  return new_count;
end;
$$;

-- (Again, no policy granted. The service role can call it via REST.)


-- ============================================================================
-- End of 0001_init.sql
-- ============================================================================
