-- 0007 · creator self-service and live clicks on the Wire.

-- A creator creates (and later edits) their own profile. Their account name becomes their display name.
-- Audience shares are self-reported; impressions default from followers and CTR starts at a neutral 1.00 %.
create or replace function save_creator_profile(
  p_display_name text, p_handle text, p_headline text, p_bio text, p_country text, p_verticals text[],
  p_followers int, p_rate_cents int, p_typical_impressions int, p_roles jsonb, p_geo jsonb)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_account uuid := app._me(); v_id uuid; v_imp int; v_name text := btrim(coalesce(p_display_name, ''));
begin
  if not exists (select 1 from accounts where id = v_account and role = 'creator') then raise exception 'not_a_creator' using errcode = '42501'; end if;
  if length(v_name) not between 1 and 80 then raise exception 'invalid_name'; end if;
  if p_handle is null or p_handle !~ '^[a-z0-9-]{3,40}$' then
    raise exception 'invalid_handle' using detail = '3 to 40 characters: lowercase letters, numbers and hyphens.';
  end if;
  if exists (select 1 from creators where handle = p_handle and account_id is distinct from v_account) then raise exception 'handle_taken'; end if;
  if p_headline is null or length(btrim(p_headline)) not between 5 and 120 then raise exception 'invalid_headline'; end if;
  if coalesce(length(p_bio), 0) > 600 then raise exception 'bio_too_long'; end if;
  if p_rate_cents is null or p_rate_cents < 2000 or p_rate_cents > 500000 then raise exception 'invalid_rate'; end if;
  if p_followers is null or p_followers < 0 or p_followers > 50000000 then raise exception 'invalid_followers'; end if;
  if coalesce(cardinality(p_verticals), 0) not between 1 and 3 then raise exception 'invalid_verticals'; end if;
  if p_typical_impressions is not null and (p_typical_impressions < 0 or p_typical_impressions > 500000000) then raise exception 'invalid_impressions'; end if;
  if exists (select 1 from jsonb_each(coalesce(p_roles, '{}')) e where jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric not between 0 and 1)
     or (select count(*) from jsonb_object_keys(coalesce(p_roles, '{}'))) > 6
     or exists (select 1 from jsonb_each(coalesce(p_geo, '{}')) e where jsonb_typeof(e.value) <> 'number' or (e.value #>> '{}')::numeric not between 0 and 1)
     or (select count(*) from jsonb_object_keys(coalesce(p_geo, '{}'))) > 6
  then raise exception 'invalid_audience'; end if;

  v_imp := coalesce(nullif(p_typical_impressions, 0), round(p_followers * 0.18)::int);
  update accounts set display_name = v_name where id = v_account;
  insert into creators (account_id, handle, display_name, headline, bio, country, verticals, followers, rate_cents, audience,
                        imp_p25, imp_p50, imp_p75, ctr_p50, verified, is_sandbox)
  values (v_account, p_handle, v_name, btrim(p_headline), btrim(coalesce(p_bio, '')), p_country, p_verticals, p_followers, p_rate_cents,
          jsonb_build_object('roles', coalesce(p_roles, '{}'), 'geo', coalesce(p_geo, '{}')),
          round(v_imp * 0.7), v_imp, round(v_imp * 1.4), 1.00, false, false)
  on conflict (account_id) do update set
    handle = excluded.handle, display_name = excluded.display_name, headline = excluded.headline, bio = excluded.bio,
    country = excluded.country, verticals = excluded.verticals, followers = excluded.followers, rate_cents = excluded.rate_cents,
    audience = excluded.audience, imp_p25 = excluded.imp_p25, imp_p50 = excluded.imp_p50, imp_p75 = excluded.imp_p75
  returning id into v_id;
  return v_id;
end $$;

-- Autosave for a draft in progress: stores the text without changing the booking's state.
create or replace function save_draft(p_booking uuid, p_text text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform app._require_creator_of(p_booking);
  if length(coalesce(p_text, '')) > 5000 then raise exception 'draft_too_long'; end if;
  update bookings set draft_text = p_text, updated_at = now() where id = p_booking and status in ('accepted','changes_requested');
  if not found then raise exception 'invalid_state'; end if;
end $$;

-- The Wire now carries real clicks: human clicks from the last 7 days, grouped into 5-minute buckets per booking.
drop view if exists wire_events;
create view wire_events as
  select 'e' || e.id::text as id, e.at, e.kind, e.booking_id, vb.campaign_id,
         app.event_text(e.kind, cr.display_name, c.title, e.meta) as text
    from booking_events e
    join (select b.id, b.campaign_id, b.creator_id from bookings b where app.can_see_booking(b.id)) vb on vb.id = e.booking_id
    join creators cr on cr.id = vb.creator_id
    join campaigns c on c.id = vb.campaign_id
  union all
  select 'c' || t.booking_id::text || ':' || (floor(extract(epoch from t.at) / 300))::bigint::text as id,
         max(t.at) as at, 'click'::text as kind, t.booking_id, vb.campaign_id,
         '+' || count(*) || case when count(*) = 1 then ' click' else ' clicks' end || ' · ' || cr.display_name || ' · ' || c.title as text
    from tracking_events t
    join (select b.id, b.campaign_id, b.creator_id from bookings b where app.can_see_booking(b.id)) vb on vb.id = t.booking_id
    join creators cr on cr.id = vb.creator_id
    join campaigns c on c.id = vb.campaign_id
   where t.kind = 'click' and t.ua_class = 'human' and t.at > now() - interval '7 days'
   group by t.booking_id, (floor(extract(epoch from t.at) / 300))::bigint, vb.campaign_id, cr.display_name, c.title;
grant select on wire_events to byline_user;

grant execute on function
  save_creator_profile(text, text, text, text, text, text[], int, int, int, jsonb, jsonb),
  save_draft(uuid, text)
to byline_user;
