-- 0003_admin.sql
-- The campaign desk (/admin/ on byronfor25.com): signed-in campaign admins
-- can read every submission and update follow-up fields. Nobody else can.
--
-- Access model after this file:
--   * anon (the public site): unchanged. INSERT only, on the same column
--     lists as 0001. No reads, edits or deletes.
--   * authenticated: SELECT on the four tables and two views, and UPDATE on
--     status / notes / contacted_at only, and only when the signed-in email is
--     in private.campaign_admins. Any other signed-in user sees zero rows and
--     updates zero rows. Self sign-up is turned off in Auth settings, so the
--     only users are the ones created in the Supabase dashboard.
--   * private.campaign_admins: readable and writable only by the database
--     owner (dashboard SQL editor). No anon or authenticated grant at all.
--
-- This file inserts no admin. Add one by hand, see supabase/README.md:
--   insert into private.campaign_admins (email) values ('you@example.com');

begin;

-- ---------------------------------------------------------------------------
-- Admin list (private schema: not exposed through the Data API)
-- ---------------------------------------------------------------------------

create extension if not exists citext with schema extensions;

create table if not exists private.campaign_admins (
  email    extensions.citext primary key
           check (char_length(email::text) <= 254 and email::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  added_at timestamptz not null default now()
);

comment on table private.campaign_admins is
  'Emails allowed into the /admin/ campaign desk. Edit only from the dashboard SQL editor.';

alter table private.campaign_admins enable row level security;
-- No policies on purpose: only the owner (postgres) and service_role, which
-- bypass RLS, can touch it.
revoke all on table private.campaign_admins from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- is_campaign_admin(): true when the caller's JWT email is on the list.
-- SECURITY DEFINER so it can read private.campaign_admins, which callers
-- cannot. Safe because it reads only the caller's own JWT and returns a
-- boolean. Lives in the private schema, so it is not an RPC endpoint.
-- The email claim comes from auth.users (not user_metadata, which users can
-- edit), and an email change only lands in the JWT after it is confirmed.
-- ---------------------------------------------------------------------------

create or replace function private.is_campaign_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1
      from private.campaign_admins a
      -- explicit citext operator: with an empty search_path a bare "=" would
      -- fall back to case-sensitive text equality
      where a.email operator(extensions.=) (auth.jwt() ->> 'email')::extensions.citext
    );
$$;

revoke all on function private.is_campaign_admin() from public, anon;
grant usage on schema private to authenticated;   -- needed to evaluate the policies
grant execute on function private.is_campaign_admin() to authenticated;

-- A tiny RPC so the desk can tell "not an admin" apart from "no rows yet".
-- SECURITY INVOKER: it can only report on the caller's own email.
create or replace function public.am_i_campaign_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_campaign_admin();
$$;

revoke all on function public.am_i_campaign_admin() from public, anon;
grant execute on function public.am_i_campaign_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Follow-up columns
-- volunteers and petition_requests get a new status (new / contacted /
-- confirmed / no). event_rsvps keeps its existing status vocabulary (going /
-- maybe / cancelled / attended / no_show), because the anon insert policy and
-- the rsvps_by_event headcount depend on it.
-- ---------------------------------------------------------------------------

alter table public.volunteers
  add column if not exists status text not null default 'new'
    constraint volunteers_status_check check (status in ('new', 'contacted', 'confirmed', 'no')),
  add column if not exists notes text
    constraint volunteers_notes_len check (notes is null or char_length(notes) <= 2000),
  add column if not exists contacted_at timestamptz;

alter table public.petition_requests
  add column if not exists status text not null default 'new'
    constraint petition_requests_status_check check (status in ('new', 'contacted', 'confirmed', 'no')),
  add column if not exists notes text
    constraint petition_requests_notes_len check (notes is null or char_length(notes) <= 2000),
  add column if not exists contacted_at timestamptz;

alter table public.event_rsvps
  add column if not exists notes text
    constraint event_rsvps_notes_len check (notes is null or char_length(notes) <= 2000),
  add column if not exists contacted_at timestamptz;

-- No new indexes: the desk loads each table ordered by created_at, which the
-- existing *_created_at_idx indexes cover, and filters in the browser. The
-- policies call is_campaign_admin() once per statement (wrapped in a scalar
-- subquery), which is a primary-key lookup on a table of a few rows.

-- ---------------------------------------------------------------------------
-- Policies for campaign admins (anon policies from 0001 are untouched)
-- ---------------------------------------------------------------------------

create policy "campaign admins can read volunteers"
  on public.volunteers for select to authenticated
  using ((select private.is_campaign_admin()));

create policy "campaign admins can update volunteer follow-up"
  on public.volunteers for update to authenticated
  using ((select private.is_campaign_admin()))
  with check ((select private.is_campaign_admin()));

create policy "campaign admins can read rsvps"
  on public.event_rsvps for select to authenticated
  using ((select private.is_campaign_admin()));

create policy "campaign admins can update rsvp follow-up"
  on public.event_rsvps for update to authenticated
  using ((select private.is_campaign_admin()))
  with check ((select private.is_campaign_admin()));

create policy "campaign admins can read petition requests"
  on public.petition_requests for select to authenticated
  using ((select private.is_campaign_admin()));

create policy "campaign admins can update petition follow-up"
  on public.petition_requests for update to authenticated
  using ((select private.is_campaign_admin()))
  with check ((select private.is_campaign_admin()));

create policy "campaign admins can read actions"
  on public.actions for select to authenticated
  using ((select private.is_campaign_admin()));

-- ---------------------------------------------------------------------------
-- Grants for authenticated. Column-level UPDATE: admins can change the
-- follow-up fields and nothing else (no names, contacts, created_at, ...).
-- No DELETE for anyone but the owner.
-- ---------------------------------------------------------------------------

grant select on table public.volunteers, public.event_rsvps, public.petition_requests, public.actions
  to authenticated;

grant update (status, notes, contacted_at) on public.volunteers        to authenticated;
grant update (status, notes, contacted_at) on public.event_rsvps       to authenticated;
grant update (status, notes, contacted_at) on public.petition_requests to authenticated;

-- Views cannot carry policies of their own. Both are security_invoker
-- (0002), so they run as the reader and the table policies above decide
-- what they return: everything for an admin, zeros for anyone else.
grant select on public.campaign_daily_summary, public.rsvps_by_event to authenticated;

commit;
