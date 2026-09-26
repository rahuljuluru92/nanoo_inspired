-- 0005 · row-level security, views, grants.
-- Defence in depth: RLS on every table, column-level grants (no password hashes, no IP hashes),
-- user-facing views that filter by app.uid(), and EXECUTE revoked from PUBLIC on every function.

-- ---------- ownership helpers (SECURITY DEFINER so policies can use them without recursing into RLS) ----------
create or replace function app.owns_brand(p_brand uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from brands where id = p_brand and owner_id = app.uid())
$$;
create or replace function app.is_my_creator(p_creator uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from creators where id = p_creator and account_id = app.uid())
$$;
create or replace function app.owns_campaign(p_campaign uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from campaigns c join brands b on b.id = c.brand_id where c.id = p_campaign and b.owner_id = app.uid())
$$;
create or replace function app.can_see_booking(p_booking uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from bookings b
    join campaigns c on c.id = b.campaign_id
    join brands br on br.id = c.brand_id
    join creators cr on cr.id = b.creator_id
    where b.id = p_booking and (br.owner_id = app.uid() or cr.account_id = app.uid()))
$$;

-- ---------- RLS ----------
alter table accounts        enable row level security;
alter table sessions        enable row level security;
alter table brands          enable row level security;
alter table creators        enable row level security;
alter table creator_posts   enable row level security;
alter table campaigns       enable row level security;
alter table bookings        enable row level security;
alter table booking_events  enable row level security;
alter table tracking_events enable row level security;
alter table post_stats      enable row level security;
alter table ledger_entries  enable row level security;
alter table notifications   enable row level security;

grant usage on schema public to byline_anon, byline_user;

-- accounts: own row, no password hash
grant select (id, email, role, display_name, is_demo, created_at) on accounts to byline_user;
create policy accounts_self on accounts for select to byline_user using (id = app.uid());

-- brands / creators (base tables: own rows only; everyone else reads creators through public_creators)
grant select on brands to byline_user;
create policy brands_own on brands for select to byline_user using (owner_id = app.uid());
grant select on creators to byline_user;
create policy creators_own on creators for select to byline_user using (account_id = app.uid());

-- public portfolio data
grant select on creator_posts to byline_anon, byline_user;
create policy creator_posts_public on creator_posts for select to byline_anon, byline_user using (true);

-- campaigns: brand owner only (creators read what they need through my_offers)
grant select on campaigns to byline_user;
create policy campaigns_owner on campaigns for select to byline_user using (app.owns_brand(brand_id));

-- bookings and everything hanging off them: visible to the brand that owns the campaign and the booked creator
grant select on bookings to byline_user;
create policy bookings_parties on bookings for select to byline_user using (app.can_see_booking(id));
grant select on booking_events to byline_user;
create policy booking_events_parties on booking_events for select to byline_user using (app.can_see_booking(booking_id));
grant select (id, booking_id, kind, at, ua_class, country, referrer) on tracking_events to byline_user;   -- no ip_hash
create policy tracking_events_parties on tracking_events for select to byline_user using (app.can_see_booking(booking_id));
grant select on post_stats to byline_user;
create policy post_stats_parties on post_stats for select to byline_user using (app.can_see_booking(booking_id));

-- ledger: a brand sees its own money; a creator sees only their creator_balance legs
grant select on ledger_entries to byline_user;
create policy ledger_parties on ledger_entries for select to byline_user using (
  app.owns_brand(brand_id) or (account = 'creator_balance' and app.is_my_creator(creator_id)));

grant select on notifications to byline_user;
create policy notifications_own on notifications for select to byline_user using (account_id = app.uid());

-- ---------- views (definer views with explicit filters) ----------
create or replace view public_creators as
  select id, handle, display_name, headline, bio, country, verticals, followers, rate_cents, audience,
         imp_p25, imp_p50, imp_p75, ctr_p50, verified, is_sandbox, created_at
  from creators;
grant select on public_creators to byline_anon, byline_user;

-- internal, unfiltered per-booking click metrics (human clicks only; bots and link previews are never counted)
create or replace view booking_metrics_all as
  select booking_id,
         count(*) filter (where kind = 'click' and ua_class = 'human')                    as clicks_total,
         count(distinct ip_hash) filter (where kind = 'click' and ua_class = 'human')     as clicks_unique,
         max(at) filter (where kind = 'click' and ua_class = 'human')                     as last_click_at
  from tracking_events group by booking_id;

create or replace view booking_metrics as
  select * from booking_metrics_all where app.can_see_booking(booking_id);
grant select on booking_metrics to byline_user;

-- what a creator needs to read an offer: the booking, plus the brand's campaign brief (never the brand's budget)
create or replace view my_offers as
  select b.id as booking_id, b.status, b.price_cents, b.due_at, b.invited_at, b.responded_at, b.submitted_at, b.approved_at,
         b.live_at, b.paid_at, b.draft_text, b.draft_version, b.post_url, b.tracking_code,
         c.id as campaign_id, c.title as campaign_title, c.objective, c.key_messages, c.guidelines, c.publish_by, c.destination_url,
         br.company_name as brand_name
  from bookings b
  join creators cr on cr.id = b.creator_id
  join campaigns c on c.id = b.campaign_id
  join brands br on br.id = c.brand_id
  where cr.account_id = app.uid();
grant select on my_offers to byline_user;

create or replace function app.event_text(p_kind text, p_name text, p_title text, p_meta jsonb) returns text
language sql immutable as $$
  select case p_kind
    when 'offer_sent'        then 'Offer sent to ' || p_name || ' · ' || p_title
    when 'offer_accepted'    then p_name || ' accepted · ' || p_title
    when 'offer_declined'    then p_name || ' declined · ' || p_title
    when 'draft_submitted'   then p_name || ' submitted a draft · ' || p_title
    when 'changes_requested' then 'Changes requested from ' || p_name || ' · ' || p_title
    when 'draft_approved'    then 'Draft approved · ' || p_name || ' · ' || p_title
    when 'went_live'         then p_name || ' went live · ' || p_title
    when 'stats_reported'    then p_name || ' reported ' || to_char(coalesce((p_meta ->> 'impressions')::int, 0), 'FM999G999G999') || ' impressions · ' || p_title
    when 'payout_released'   then '€' || to_char(coalesce((p_meta ->> 'amount_cents')::int, 0) / 100.0, 'FM999G999') || ' released to ' || p_name || ' · ' || p_title
    when 'cancelled'         then 'Offer to ' || p_name || ' cancelled · ' || p_title
    else p_kind || ' · ' || p_name
  end
$$;

create or replace view wire_events as
  select e.id, e.at, e.kind, e.booking_id, b.campaign_id,
         app.event_text(e.kind, cr.display_name, c.title, e.meta) as text
  from booking_events e
  join bookings b on b.id = e.booking_id
  join creators cr on cr.id = b.creator_id
  join campaigns c on c.id = b.campaign_id
  where app.can_see_booking(e.booking_id);
grant select on wire_events to byline_user;

-- public receipts: unlisted by unguessable code, revocable per booking
create or replace view public_receipts as
  select b.tracking_code as code, b.id as booking_id, b.status, b.live_at, b.paid_at, b.post_url, b.price_cents,
         cr.handle, cr.display_name as creator_name, cr.headline,
         br.company_name as brand_name, c.title as campaign_title,
         ps.impressions, ps.source as impressions_source,
         coalesce(m.clicks_total, 0) as clicks_total, coalesce(m.clicks_unique, 0) as clicks_unique
  from bookings b
  join creators cr on cr.id = b.creator_id
  join campaigns c on c.id = b.campaign_id
  join brands br on br.id = c.brand_id
  left join post_stats ps on ps.booking_id = b.id
  left join booking_metrics_all m on m.booking_id = b.id
  where b.receipt_public and b.status in ('live','paid');
grant select on public_receipts to byline_anon, byline_user;

-- ---------- functions: nothing is callable by default ----------
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema app    revoke execute on functions from public;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema app    from public;

-- helpers used inside policies/views (run as the caller, so they need EXECUTE)
grant execute on function app.uid(), app.owns_brand(uuid), app.is_my_creator(uuid), app.owns_campaign(uuid),
                          app.can_see_booking(uuid), app.event_text(text, text, text, jsonb) to byline_anon, byline_user;

-- the public API surface for signed-in users
grant execute on function
  top_up_wallet(int),
  create_campaign(text, jsonb, text, text, text, text, int, date),
  place_hold(uuid, uuid[]),
  request_changes(uuid, text), approve_draft(uuid), release_payout(uuid), cancel_booking(uuid),
  accept_offer(uuid), decline_offer(uuid, text), submit_draft(uuid, text), mark_live(uuid, text),
  report_stats(uuid, int, int, int), mark_notifications_read(), sandbox_tick()
to byline_user;
-- create_account, link_lookup, record_click, reset_demo (0006) stay owner-only / explicitly granted.
