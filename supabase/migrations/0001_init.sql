-- 0001_init.sql
-- byronfor25.com intake tables: volunteers, event RSVPs, petition requests,
-- and a generic actions log.
--
-- Access model (see supabase/README.md):
--   * anon (the public site, publishable key): INSERT only, on an explicit
--     column list, gated by RLS insert policies. No SELECT, UPDATE or DELETE.
--   * authenticated: no access at all. The campaign does not sign in to the
--     site; it reads through the Supabase dashboard (postgres role) or the
--     service role from a trusted machine. Neither ever ships to a browser.
--   * The site inserts with `Prefer: return=minimal`, so it never needs SELECT.
--
-- Grants are revoked and re-granted explicitly, so this file gives the same
-- result whether the project still has Supabase's old "auto-grant everything
-- in public" default privileges or the newer opt-in default.

begin;

-- ---------------------------------------------------------------------------
-- Shared helpers (private schema: not exposed through the Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Normalizes contact fields before every insert or update:
--   email -> trimmed, lowercased, empty string becomes null
--   phone -> keeps digits and a leading +, empty becomes null
-- SECURITY INVOKER (the default): it only rewrites NEW, it reads no tables.
create or replace function private.normalize_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is not null then
    new.email := nullif(lower(btrim(new.email)), '');
  end if;
  if new.phone is not null then
    new.phone := nullif(regexp_replace(btrim(new.phone), '[^0-9+]', '', 'g'), '');
  end if;
  return new;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on new functions. Firing a trigger does
-- not check EXECUTE for the inserting role, so nobody else needs it.
revoke all on function private.normalize_contact() from public;

-- ---------------------------------------------------------------------------
-- volunteers: mirror of the /volunteer sign-up form (SignupForm.astro)
-- ---------------------------------------------------------------------------

create table public.volunteers (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  first_name  text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name   text not null check (char_length(btrim(last_name))  between 1 and 80),
  email       text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone       text check (phone is null or char_length(phone) between 7 and 20),
  zip         text check (zip is null or zip ~ '^[0-9]{5}$'),
  city        text check (city is null or char_length(city) <= 80),
  language    text not null default 'en' check (language in ('en', 'es')),
  -- The exact checkbox values posted to the Google Form (frozen strings).
  interests   text[] not null default '{}'
              check (cardinality(interests) <= 20),
  source_page text check (source_page is null or char_length(source_page) <= 300),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 400),
  -- Hidden honeypot input. Humans leave it empty; bots fill it. Rows are kept
  -- (so nothing silently disappears) but flagged for review.
  honeypot    text check (honeypot is null or char_length(honeypot) <= 200),
  flagged     boolean generated always as (coalesce(honeypot, '') <> '') stored,
  constraint volunteers_contact_present check (email is not null or phone is not null)
);

comment on table public.volunteers is
  'Volunteer sign-ups from byronfor25.com/volunteer. Written in parallel with the frozen Google Form; the Google sheet stays the intake of record.';

create index volunteers_created_at_idx on public.volunteers (created_at desc);
create index volunteers_email_idx on public.volunteers (email) where email is not null;

create trigger volunteers_normalize_contact
  before insert or update on public.volunteers
  for each row execute function private.normalize_contact();

-- ---------------------------------------------------------------------------
-- event_rsvps: "Tell us you're coming" on event cards
-- ---------------------------------------------------------------------------

create table public.event_rsvps (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  -- The `id` of an entry in src/data/events.json (same slug rule as events.js).
  -- Not a foreign key: the events list lives in the repo, not the database.
  event_id       text not null check (char_length(event_id) <= 120 and event_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text not null check (char_length(btrim(name)) between 1 and 120),
  email          text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone          text check (phone is null or char_length(phone) between 7 and 20),
  zip            text check (zip is null or zip ~ '^[0-9]{5}$'),
  bringing_count integer not null default 0 check (bringing_count between 0 and 10),
  language       text not null default 'en' check (language in ('en', 'es')),
  status         text not null default 'going' check (status in ('going', 'maybe', 'cancelled', 'attended', 'no_show')),
  source_page    text check (source_page is null or char_length(source_page) <= 300),
  user_agent     text check (user_agent is null or char_length(user_agent) <= 400),
  honeypot       text check (honeypot is null or char_length(honeypot) <= 200),
  flagged        boolean generated always as (coalesce(honeypot, '') <> '') stored,
  constraint event_rsvps_contact_present check (email is not null or phone is not null)
);

comment on table public.event_rsvps is
  'RSVPs from event cards. event_id = id in src/data/events.json. status is set by the campaign in the dashboard (attended / no_show / cancelled).';

-- One RSVP per person per event: a repeat tap returns 409 and the site
-- treats it as success. These also serve lookups by event_id.
create unique index event_rsvps_event_email_uniq on public.event_rsvps (event_id, email) where email is not null;
create unique index event_rsvps_event_phone_uniq on public.event_rsvps (event_id, phone) where phone is not null;
create index event_rsvps_event_created_idx on public.event_rsvps (event_id, created_at desc);
create index event_rsvps_created_at_idx on public.event_rsvps (created_at desc);

create trigger event_rsvps_normalize_contact
  before insert or update on public.event_rsvps
  for each row execute function private.normalize_contact();

-- ---------------------------------------------------------------------------
-- petition_requests: the petition modal (PetitionModal.astro), plus room for
-- a "bring the petition to my door" request (address + preferred time)
-- ---------------------------------------------------------------------------

create table public.petition_requests (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  name           text not null check (char_length(btrim(name)) between 1 and 120),
  address        text check (address is null or char_length(address) <= 200),
  city           text check (city is null or char_length(city) <= 80),
  zip            text check (zip is null or zip ~ '^[0-9]{5}$'),
  phone          text check (phone is null or char_length(phone) between 7 and 20),
  email          text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  preferred_time text check (preferred_time is null or char_length(preferred_time) <= 120),
  -- The frozen checkbox values from the modal ("Sign Byron's petition", ...).
  intents        text[] not null default '{}' check (cardinality(intents) <= 10),
  help_with      text[] not null default '{}' check (cardinality(help_with) <= 10),
  language       text not null default 'en' check (language in ('en', 'es')),
  source_page    text check (source_page is null or char_length(source_page) <= 300),
  user_agent     text check (user_agent is null or char_length(user_agent) <= 400),
  honeypot       text check (honeypot is null or char_length(honeypot) <= 200),
  flagged        boolean generated always as (coalesce(honeypot, '') <> '') stored,
  handled_at     timestamptz,  -- set by the campaign once someone follows up
  constraint petition_requests_contact_present check (email is not null or phone is not null)
);

comment on table public.petition_requests is
  'Petition sign / help requests from the site modal. Written in parallel with the frozen Google Form.';

create index petition_requests_created_at_idx on public.petition_requests (created_at desc);
create index petition_requests_open_idx on public.petition_requests (created_at) where handled_at is null;

create trigger petition_requests_normalize_contact
  before insert or update on public.petition_requests
  for each row execute function private.normalize_contact();

-- ---------------------------------------------------------------------------
-- actions: generic log for future one-tap actions (share clicks, pledges...)
-- ---------------------------------------------------------------------------

create table public.actions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  action      text not null check (action ~ '^[a-z0-9]+([_.-][a-z0-9]+)*$' and char_length(action) <= 60),
  payload     jsonb not null default '{}'::jsonb
              check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 4096),
  language    text not null default 'en' check (language in ('en', 'es')),
  source_page text check (source_page is null or char_length(source_page) <= 300),
  honeypot    text check (honeypot is null or char_length(honeypot) <= 200),
  flagged     boolean generated always as (coalesce(honeypot, '') <> '') stored
);

comment on table public.actions is
  'Generic action log for future features. Keep PII out of payload unless a feature truly needs it.';

create index actions_created_at_idx on public.actions (created_at desc);
create index actions_action_created_idx on public.actions (action, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.volunteers        enable row level security;
alter table public.event_rsvps       enable row level security;
alter table public.petition_requests enable row level security;
alter table public.actions           enable row level security;

-- Insert-only policies for the public site. The CHECK constraints above do
-- the field validation; the policies pin what the public may NOT set.
create policy "public site can add a volunteer"
  on public.volunteers for insert to anon
  with check (true);

create policy "public site can add an rsvp as going"
  on public.event_rsvps for insert to anon
  with check (status = 'going');

create policy "public site can add a petition request"
  on public.petition_requests for insert to anon
  with check (handled_at is null);

create policy "public site can log an action"
  on public.actions for insert to anon
  with check (true);

-- No SELECT / UPDATE / DELETE policy exists for anon or authenticated, so
-- those are denied by RLS even if a grant slipped through.

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then allow INSERT on named columns only.
-- id, created_at, flagged, status (rsvps) and handled_at are never client-set.
-- ---------------------------------------------------------------------------

revoke all on table public.volunteers, public.event_rsvps, public.petition_requests, public.actions
  from public, anon, authenticated;

grant insert (first_name, last_name, email, phone, zip, city, language, interests,
              source_page, user_agent, honeypot)
  on public.volunteers to anon;

grant insert (event_id, name, email, phone, zip, bringing_count, language,
              source_page, user_agent, honeypot)
  on public.event_rsvps to anon;

grant insert (name, address, city, zip, phone, email, preferred_time, intents, help_with,
              language, source_page, user_agent, honeypot)
  on public.petition_requests to anon;

grant insert (action, payload, language, source_page, honeypot)
  on public.actions to anon;

-- service_role (trusted server-side scripts, CSV exports, a future Sheets
-- sync) keeps full access. It bypasses RLS by design; never ship its key.
grant all on table public.volunteers, public.event_rsvps, public.petition_requests, public.actions
  to service_role;

commit;
