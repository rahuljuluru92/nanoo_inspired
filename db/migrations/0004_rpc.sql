-- 0004 · public RPCs. SECURITY DEFINER with a pinned search_path; each checks who is calling.
-- The client never writes balances, statuses or prices directly — only through these.

-- server-only (no grant to byline_user): creating an account is done by the auth layer with the owner connection
create or replace function create_account(p_email text, p_password_hash text, p_role text, p_display_name text,
                                          p_company text default null, p_is_demo boolean default false)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v uuid;
begin
  if p_role not in ('brand','creator') then raise exception 'invalid_role'; end if;
  if lower(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if exists (select 1 from accounts where email = lower(p_email)) then raise exception 'email_taken'; end if;
  insert into accounts (email, password_hash, role, display_name, is_demo)
  values (lower(p_email), p_password_hash, p_role, btrim(p_display_name), p_is_demo) returning id into v;
  if p_role = 'brand' then
    if p_company is null or length(btrim(p_company)) < 1 then raise exception 'company_required'; end if;
    insert into brands (owner_id, company_name) values (v, btrim(p_company));
  end if;
  return v;
end $$;

-- ---------- brand ----------

create or replace function top_up_wallet(p_amount_cents int) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_brand uuid := app._brand_id(); v_wallet int;
begin
  if p_amount_cents is null or p_amount_cents < 1000 or p_amount_cents > 5000000 then
    raise exception 'invalid_amount' using detail = 'Test top-ups are between €10 and €50,000.';
  end if;
  perform 1 from brands where id = v_brand for update;
  perform app._move(gen_random_uuid(), 'topup', 'external', 'brand_wallet', p_amount_cents, v_brand, null, null);
  select wallet_cents into v_wallet from brands where id = v_brand;
  return v_wallet;
end $$;

create or replace function create_campaign(p_title text, p_sentence jsonb, p_objective text, p_destination_url text,
                                           p_key_messages text, p_guidelines text, p_budget_cents int, p_publish_by date)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_brand uuid := app._brand_id(); v uuid;
begin
  if p_title is null or length(btrim(p_title)) not between 3 and 80 then
    raise exception 'invalid_title' using detail = 'Give the campaign a title of 3 to 80 characters.';
  end if;
  if p_destination_url is null or p_destination_url !~* '^https?://[^\s]+\.[^\s]+$' then
    raise exception 'invalid_url' using detail = 'Enter a full link, starting with https://';
  end if;
  if p_objective not in ('demos','signups','awareness') then raise exception 'invalid_objective'; end if;
  insert into campaigns (brand_id, title, sentence, objective, destination_url, key_messages, guidelines, budget_cents, publish_by)
  values (v_brand, btrim(p_title), coalesce(p_sentence, '{}'), p_objective, p_destination_url,
          coalesce(btrim(p_key_messages), ''), coalesce(btrim(p_guidelines), ''), greatest(coalesce(p_budget_cents, 0), 0),
          coalesce(p_publish_by, current_date + 21))
  returning id into v;
  return v;
end $$;

-- Hold funds and send offers. Price is taken from creators.rate_cents — the client cannot set it. Atomic.
create or replace function place_hold(p_campaign uuid, p_creator_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_brand brands; v_camp campaigns; v_cr creators; v_b uuid; v_ids uuid[] := '{}';
  v_total int; v_found int; v_distinct int;
begin
  select * into v_brand from brands where id = app._brand_id() for update;   -- serialises this brand's money moves
  select * into v_camp from campaigns where id = p_campaign and brand_id = v_brand.id;
  if not found then raise exception 'campaign_not_found' using errcode = 'P0002'; end if;
  if v_camp.status = 'done' then raise exception 'campaign_closed'; end if;
  if p_creator_ids is null or coalesce(array_length(p_creator_ids, 1), 0) = 0 then raise exception 'empty_lineup'; end if;
  if array_length(p_creator_ids, 1) > 20 then raise exception 'lineup_too_large'; end if;

  select count(*), coalesce(sum(rate_cents), 0) into v_found, v_total from creators where id = any (p_creator_ids);
  select count(distinct x) into v_distinct from unnest(p_creator_ids) x;
  if v_found <> v_distinct or v_distinct <> array_length(p_creator_ids, 1) then raise exception 'unknown_creator'; end if;

  if v_total > v_brand.wallet_cents then
    raise exception 'insufficient_funds'
      using detail = format('Your wallet is %s cents short.', v_total - v_brand.wallet_cents),
            hint = (v_total - v_brand.wallet_cents)::text;
  end if;

  for v_cr in select * from creators where id = any (p_creator_ids) order by display_name loop
    if exists (select 1 from bookings where campaign_id = p_campaign and creator_id = v_cr.id) then
      raise exception 'already_booked' using detail = v_cr.handle;
    end if;
    insert into bookings (campaign_id, creator_id, price_cents, status, tracking_code, due_at, auto_at)
    values (p_campaign, v_cr.id, v_cr.rate_cents, 'invited', app._new_code(), v_camp.publish_by,
            case when v_cr.is_sandbox then now() + app._delay(v_cr.id::text || p_campaign::text || 'reply', 8, 12) end)
    returning id into v_b;
    perform app._move(gen_random_uuid(), 'hold', 'brand_wallet', 'escrow', v_cr.rate_cents, v_brand.id, v_cr.id, v_b);
    perform app._event(v_b, app.uid(), 'offer_sent', null, jsonb_build_object('price_cents', v_cr.rate_cents), 'brand');
    perform app._notify(v_cr.account_id, 'offer_sent', v_b, v_brand.company_name || ' sent you an offer for ' || v_camp.title);
    v_ids := v_ids || v_b;
  end loop;

  update campaigns set status = 'active' where id = p_campaign and status = 'draft';
  return jsonb_build_object('booking_ids', to_jsonb(v_ids), 'total_cents', v_total, 'wallet_cents', v_brand.wallet_cents - v_total);
end $$;

create or replace function request_changes(p_booking uuid, p_note text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_brand_of(p_booking); perform app._request_changes(p_booking, app.uid(), p_note); end $$;

create or replace function approve_draft(p_booking uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_brand_of(p_booking); perform app._approve(p_booking, app.uid()); end $$;

create or replace function release_payout(p_booking uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_brand_of(p_booking); perform app._release(p_booking, app.uid()); end $$;

create or replace function cancel_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_brand_of(p_booking); perform app._cancel(p_booking, app.uid()); end $$;

-- ---------- creator ----------

create or replace function accept_offer(p_booking uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_creator_of(p_booking); perform app._accept(p_booking, app.uid()); end $$;

create or replace function decline_offer(p_booking uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_creator_of(p_booking); perform app._decline(p_booking, app.uid(), p_reason); end $$;

create or replace function submit_draft(p_booking uuid, p_text text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_creator_of(p_booking); perform app._submit_draft(p_booking, app.uid(), p_text); end $$;

create or replace function mark_live(p_booking uuid, p_post_url text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin perform app._require_creator_of(p_booking); perform app._mark_live(p_booking, app.uid(), p_post_url); end $$;

create or replace function report_stats(p_booking uuid, p_impressions int, p_reactions int, p_comments int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform app._require_creator_of(p_booking);
  if not exists (select 1 from bookings where id = p_booking and status in ('live','paid')) then raise exception 'invalid_state'; end if;
  if p_impressions is null or p_impressions < 0 or p_impressions > 100000000 then raise exception 'invalid_stats'; end if;
  insert into post_stats (booking_id, impressions, reactions, comments, source)
  values (p_booking, p_impressions, greatest(coalesce(p_reactions, 0), 0), greatest(coalesce(p_comments, 0), 0), 'self_reported')
  on conflict (booking_id) do update set impressions = excluded.impressions, reactions = excluded.reactions,
    comments = excluded.comments, source = 'self_reported', reported_at = now();
  perform app._event(p_booking, app.uid(), 'stats_reported', null, jsonb_build_object('impressions', p_impressions));
end $$;

-- ---------- shared ----------

create or replace function mark_notifications_read() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin update notifications set read_at = now() where account_id = app._me() and read_at is null; end $$;

-- Sandbox creators have no login: they reply on their own, lazily, when their brand next looks. Idempotent.
create or replace function sandbox_tick() returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_brand uuid; r record; n int := 0;
begin
  select id into v_brand from brands where owner_id = app.uid();
  if v_brand is null then return 0; end if;
  for r in
    select b.id, b.status
    from bookings b
    join campaigns c on c.id = b.campaign_id
    join creators cr on cr.id = b.creator_id
    where c.brand_id = v_brand and cr.is_sandbox and b.auto_at is not null and b.auto_at <= now()
      and b.status in ('invited','accepted','changes_requested','approved')
    order by b.auto_at
    limit 25
    for update of b skip locked
  loop
    if r.status = 'invited' then
      if app._h(r.id::text || 'decline') < 0.15 then
        perform app._decline(r.id, null, 'Not a fit right now.');
      else
        perform app._accept(r.id, null);
      end if;
    elsif r.status in ('accepted','changes_requested') then
      perform app._submit_draft(r.id, null, app._sandbox_draft(r.id));
    elsif r.status = 'approved' then
      perform app._mark_live(r.id, null, app._sandbox_url(r.id));
      perform app._seed_stats(r.id);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- server-only (owner connection; no grant to byline_user) ----------

create or replace function link_lookup(p_code text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('booking_id', b.id, 'status', b.status, 'destination_url', c.destination_url,
                            'campaign_title', c.title, 'handle', cr.handle)
  from bookings b join campaigns c on c.id = b.campaign_id join creators cr on cr.id = b.creator_id
  where b.tracking_code = p_code
$$;

-- Only clicks on live/paid posts are counted; anything else is a no-op.
create or replace function record_click(p_booking uuid, p_ip_hash text, p_ua_class text, p_country text, p_referrer text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into tracking_events (booking_id, kind, ip_hash, ua_class, country, referrer)
  select b.id, 'click', p_ip_hash, p_ua_class, left(p_country, 2), left(p_referrer, 200)
  from bookings b where b.id = p_booking and b.status in ('live','paid') and p_ua_class in ('human','bot','preview')
$$;
