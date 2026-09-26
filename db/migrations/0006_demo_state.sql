-- 0006 · demo world. One function builds it (initial seed AND the "reset demo" button), so they can never drift.
-- Everything here is fictional. Timestamps are relative to now(), so the demo always looks recent.

-- Insert one booking with a consistent backdated history: events, ledger (hold, and release if paid), stats and click history.
create or replace function app._seed_booking(p_campaign uuid, p_handle text, p_status booking_status, p_days_ago numeric,
                                             p_clicks_total int default null, p_clicks_unique int default null)
returns uuid language plpgsql as $$
declare
  cr creators; c campaigns; b uuid; code text := app._new_code();
  rnk int := case p_status when 'invited' then 1 when 'accepted' then 2 when 'drafted' then 3 when 'approved' then 4
                           when 'live' then 5 when 'paid' then 6 else 0 end;
  t_inv  timestamptz := now() - p_days_ago * interval '1 day';
  t_acc  timestamptz := least(t_inv + interval '2 hours', now());
  t_dr   timestamptz := least(t_inv + interval '1 day', now());
  t_ap   timestamptz := least(t_inv + interval '30 hours', now());
  t_live timestamptz := least(t_inv + interval '2 days', now());
  t_paid timestamptz := least(t_live + interval '3 days', now());
  imp int; v_total int; v_unique int;
begin
  if rnk = 0 then raise exception 'seed supports invited..paid only'; end if;
  select * into cr from creators where handle = p_handle;
  if not found then raise exception 'seed creator % is missing', p_handle; end if;
  select * into c from campaigns where id = p_campaign;

  insert into bookings (campaign_id, creator_id, price_cents, status, tracking_code, due_at, invited_at, responded_at,
                        submitted_at, approved_at, live_at, paid_at, updated_at, draft_version, post_url)
  values (p_campaign, cr.id, cr.rate_cents, p_status, code, c.publish_by, t_inv,
          case when rnk >= 2 then t_acc end, case when rnk >= 3 then t_dr end, case when rnk >= 4 then t_ap end,
          case when rnk >= 5 then t_live end, case when rnk >= 6 then t_paid end,
          case rnk when 1 then t_inv when 2 then t_acc when 3 then t_dr when 4 then t_ap when 5 then t_live else t_paid end,
          case when rnk >= 3 then 1 else 0 end,
          case when rnk >= 5 then 'https://example.com/sandbox-post/' || cr.handle || '-' || code end)
  returning id into b;
  if rnk >= 3 then update bookings set draft_text = app._sandbox_draft(b) where id = b; end if;

  perform app._event(b, null, 'offer_sent', null, jsonb_build_object('price_cents', cr.rate_cents), 'brand', t_inv);
  if rnk >= 2 then perform app._event(b, null, 'offer_accepted', null, '{}', 'creator', t_acc); end if;
  if rnk >= 3 then perform app._event(b, null, 'draft_submitted', null, '{"version":1}', 'creator', t_dr); end if;
  if rnk >= 4 then perform app._event(b, null, 'draft_approved', null, '{}', 'brand', t_ap); end if;
  if rnk >= 5 then perform app._event(b, null, 'went_live', null, '{}', 'creator', t_live); end if;

  perform app._move(gen_random_uuid(), 'hold', 'brand_wallet', 'escrow', cr.rate_cents, c.brand_id, cr.id, b, t_inv);
  if rnk >= 6 then
    perform app._move(gen_random_uuid(), 'release', 'escrow', 'creator_balance', cr.rate_cents, c.brand_id, cr.id, b, t_paid);
    perform app._event(b, null, 'payout_released', null, jsonb_build_object('amount_cents', cr.rate_cents), 'brand', t_paid);
  end if;

  if rnk >= 5 then
    imp := round(cr.imp_p50 * (0.8 + 0.4 * app._h(b::text || 'imp')));
    insert into post_stats (booking_id, impressions, reactions, comments, source, reported_at)
    values (b, imp, round(imp * 0.03), round(imp * 0.004), 'seeded', least(t_live + interval '1 hour', now()));
    perform app._event(b, null, 'stats_reported', null, jsonb_build_object('impressions', imp), 'system', least(t_live + interval '1 hour', now()));

    -- clicks follow the creator's own reach and CTR, so every Receipt is internally plausible (overridable per call)
    v_total  := coalesce(p_clicks_total, round(imp * cr.ctr_p50 / 100.0 * (0.85 + 0.3 * app._h(b::text || 'clk')))::int);
    v_unique := coalesce(p_clicks_unique, round(v_total * 0.94)::int);
    -- click history: skewed toward the first days after going live; some repeat visitors; a few crawlers that must never count
    insert into tracking_events (booking_id, kind, at, ip_hash, ua_class, country, referrer)
    select b, 'click', t_live + (now() - t_live) * power(app._h(code || i::text)::float8, 1.8),
           md5(code || (i % greatest(v_unique, 1))::text), 'human',
           (array['FR','DE','GB','NL','ES','US','SE'])[1 + floor(app._h(code || 'c' || i::text) * 6.999)::int],
           (array['linkedin.com','linkedin.com','linkedin.com','t.co','direct'])[1 + floor(app._h(code || 'r' || i::text) * 4.999)::int]
    from generate_series(1, v_total) i;
    insert into tracking_events (booking_id, kind, at, ip_hash, ua_class, country, referrer)
    select b, 'click', t_live + (now() - t_live) * app._h(code || 'b' || i::text)::float8, md5(code || 'bot' || i::text),
           case when i % 3 = 0 then 'preview' else 'bot' end, 'US', null
    from generate_series(1, greatest(v_total / 20, 1)) i where v_total > 0;
  end if;
  return b;
end $$;

create or replace function app.seed_demo_state() returns void language plpgsql as $$
declare
  hb uuid; nb uuid; pb uuid; maya uuid; maya_account uuid;
  ca uuid; cb uuid; cc uuid; b_accepted uuid; b_maya uuid;
begin
  select id into hb from brands where company_name = 'Halcyon Security';
  select id into nb from brands where company_name = 'Northwind Data';
  select id into pb from brands where company_name = 'Parallax People';
  select id, account_id into maya, maya_account from creators where handle = 'maya-okafor';
  if hb is null or nb is null or pb is null or maya is null then raise exception 'seed_missing_base_data'; end if;

  -- wipe everything derived from the three seeded brands, then rebuild
  delete from notifications where account_id in (select owner_id from brands where id in (hb, nb, pb)) or account_id = maya_account;
  delete from ledger_entries where brand_id in (hb, nb, pb);
  delete from campaigns where brand_id in (hb, nb, pb);
  update brands set wallet_cents = 0 where id in (hb, nb, pb);
  update creators c set balance_cents =
    coalesce((select sum(amount_cents) from ledger_entries l where l.creator_id = c.id and l.account = 'creator_balance'), 0);

  perform app._move(gen_random_uuid(), 'topup', 'external', 'brand_wallet', 2000000, hb, null, null, now() - interval '14 days');
  perform app._move(gen_random_uuid(), 'topup', 'external', 'brand_wallet', 1200000, nb, null, null, now() - interval '40 days');
  perform app._move(gen_random_uuid(), 'topup', 'external', 'brand_wallet', 1200000, pb, null, null, now() - interval '10 days');

  -- Halcyon Security · "Launch Q4": one booking in every state the brand can act on
  insert into campaigns (brand_id, title, sentence, objective, destination_url, key_messages, guidelines, budget_cents, publish_by, status, created_at)
  values (hb, 'Launch Q4',
          '{"product":"a SOC 2 automation tool","buyers":["CTOs","Security leads"],"verticals":["Fintech"],"geo":["France","Germany"],"budgetCents":600000}',
          'demos', 'https://halcyon.example/soc2-guide', 'SOC 2 in six weeks, not six months.',
          'Write in your own voice. No jargon. One clear next step.', 600000, current_date + 10, 'active', now() - interval '14 days')
  returning id into ca;
  perform app._seed_booking(ca, 'chloe-vance',    'paid',     12);
  perform app._seed_booking(ca, 'jonas-brandt',   'live',      4);
  perform app._seed_booking(ca, 'lea-marchetti',  'drafted',   2);
  b_accepted := app._seed_booking(ca, 'tobias-krause', 'accepted', 1);
  b_maya     := app._seed_booking(ca, 'maya-okafor',   'invited',  0.1);
  update bookings set auto_at = now() + interval '25 seconds' where id = b_accepted;   -- he drafts shortly after you arrive

  -- Northwind Data · Maya's paid deal (her Receipt), plus another public Receipt
  insert into campaigns (brand_id, title, sentence, objective, destination_url, key_messages, guidelines, budget_cents, publish_by, status, created_at)
  values (nb, 'Q3 pipeline push', '{"product":"a data quality platform","buyers":["CTOs"],"verticals":["Data & AI"],"geo":["France","Germany","UK"],"budgetCents":400000}',
          'demos', 'https://northwind.example/data-stack', 'Catch bad data before the dashboard does.',
          'Share one real example from your own work.', 400000, current_date - 10, 'done', now() - interval '40 days')
  returning id into cb;
  perform app._seed_booking(cb, 'maya-okafor',    'paid', 30);
  perform app._seed_booking(cb, 'sven-lindqvist', 'paid', 26);

  -- Parallax People · a deal waiting on Maya's draft
  insert into campaigns (brand_id, title, sentence, objective, destination_url, key_messages, guidelines, budget_cents, publish_by, status, created_at)
  values (pb, 'Hiring season', '{"product":"an interview scheduling tool","buyers":["HR leaders"],"verticals":["HR-tech"],"geo":["Netherlands","Germany"],"budgetCents":300000}',
          'signups', 'https://parallax.example/hiring-benchmarks', 'Scheduling should not be the slowest part of hiring.',
          'Keep it practical. Mention one number.', 300000, current_date + 12, 'active', now() - interval '2 days')
  returning id into cc;
  perform app._seed_booking(cc, 'maya-okafor', 'accepted', 1.5);

  -- a few notifications so the bells are not empty
  perform app._notify((select owner_id from brands where id = hb), 'draft_submitted', null, 'Léa Marchetti submitted a draft for Launch Q4');
  perform app._notify((select owner_id from brands where id = hb), 'went_live', null, 'Jonas Brandt went live for Launch Q4');
  perform app._notify(maya_account, 'offer_sent', b_maya, 'Halcyon Security sent you an offer for Launch Q4');
end $$;

create or replace function reset_demo() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from accounts where id = app._me() and is_demo) then
    raise exception 'forbidden' using errcode = '42501', detail = 'Only demo accounts can reset the demo.';
  end if;
  perform app.seed_demo_state();
end $$;
grant execute on function reset_demo() to byline_user;
