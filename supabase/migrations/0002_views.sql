-- 0002_views.sql
-- Dashboard-only summary views. security_invoker = true makes each view run
-- with the reader's own permissions, so it can never leak rows past RLS; on
-- top of that, anon and authenticated get no grant at all. Read them in the
-- Supabase dashboard (SQL editor or Table editor), which runs as postgres.
-- Times are bucketed in Chicago local time, not UTC.

begin;

create or replace view public.campaign_daily_summary
with (security_invoker = true)
as
with all_rows as (
  select 'volunteers'::text as source, created_at, flagged from public.volunteers
  union all
  select 'event_rsvps', created_at, flagged from public.event_rsvps
  union all
  select 'petition_requests', created_at, flagged from public.petition_requests
  union all
  select 'actions', created_at, flagged from public.actions
)
select
  (created_at at time zone 'America/Chicago')::date as day,
  source,
  count(*) filter (where not flagged)              as submissions,
  count(*) filter (where flagged)                  as flagged_as_bot
from all_rows
group by 1, 2
order by 1 desc, 2;

comment on view public.campaign_daily_summary is
  'Submissions per Chicago day per table, honeypot-flagged rows counted separately. Dashboard only.';

create or replace view public.rsvps_by_event
with (security_invoker = true)
as
select
  event_id,
  count(*) filter (where status in ('going', 'attended', 'no_show'))       as rsvps,
  coalesce(sum(bringing_count) filter (where status in ('going', 'attended', 'no_show')), 0)
                                                                           as plus_ones,
  count(*) filter (where status in ('going', 'attended', 'no_show'))
    + coalesce(sum(bringing_count) filter (where status in ('going', 'attended', 'no_show')), 0)
                                                                           as expected_people,
  count(*) filter (where status = 'attended')                               as attended,
  count(*) filter (where status = 'cancelled')                              as cancelled,
  count(*) filter (where language = 'es' and status <> 'cancelled')         as spanish_speakers,
  min(created_at)                                                           as first_rsvp_at,
  max(created_at)                                                           as last_rsvp_at
from public.event_rsvps
where not flagged
group by event_id
order by max(created_at) desc;

comment on view public.rsvps_by_event is
  'Headcount per events.json id (excludes honeypot-flagged rows). Dashboard only.';

revoke all on public.campaign_daily_summary, public.rsvps_by_event from public, anon, authenticated;
grant select on public.campaign_daily_summary, public.rsvps_by_event to service_role;

commit;
