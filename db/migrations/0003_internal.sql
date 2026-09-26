-- 0003 · internal functions (no auth checks; called only by the SECURITY DEFINER RPCs in 0004).
-- One implementation of every rule, shared by real users and by sandbox creators.

create or replace function app._me() returns uuid language plpgsql stable as $$
declare v uuid := app.uid();
begin
  if v is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  return v;
end $$;

create or replace function app._brand_id() returns uuid language plpgsql stable as $$
declare v uuid;
begin
  select id into v from brands where owner_id = app._me();
  if v is null then raise exception 'not_a_brand' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function app._creator_id() returns uuid language plpgsql stable as $$
declare v uuid;
begin
  select id into v from creators where account_id = app._me();
  if v is null then raise exception 'not_a_creator' using errcode = '42501'; end if;
  return v;
end $$;

-- the caller must be the brand that owns / the creator who is booked on this booking
create or replace function app._require_brand_of(p_booking uuid) returns void language plpgsql stable as $$
begin
  if not exists (select 1 from bookings b join campaigns c on c.id = b.campaign_id
                 where b.id = p_booking and c.brand_id = app._brand_id()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create or replace function app._require_creator_of(p_booking uuid) returns void language plpgsql stable as $$
begin
  if not exists (select 1 from bookings b where b.id = p_booking and b.creator_id = app._creator_id()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create or replace function app._delay(p_key text, p_min numeric, p_span numeric) returns interval language sql immutable as $$
  select make_interval(secs => p_min + p_span * app._h(p_key))
$$;

create or replace function app._event(p_booking uuid, p_actor uuid, p_kind text, p_note text default null,
                                      p_meta jsonb default '{}', p_role text default null, p_at timestamptz default now())
returns void language sql as $$
  insert into booking_events (booking_id, actor_id, actor_role, kind, note, meta, at)
  values (p_booking, p_actor,
          coalesce(p_role, case when p_actor is null then 'system' else 'creator' end),
          p_kind, p_note, p_meta, p_at)
$$;

create or replace function app._notify(p_account uuid, p_kind text, p_booking uuid, p_body text) returns void language sql as $$
  insert into notifications (account_id, kind, booking_id, body)
  select p_account, p_kind, p_booking, p_body where p_account is not null
$$;

-- Move money between ledger accounts. Both legs are written together; the deferred trigger proves they net to zero.
create or replace function app._move(p_txn uuid, p_kind text, p_from text, p_to text, p_amount int,
                                     p_brand uuid, p_creator uuid, p_booking uuid, p_at timestamptz default now())
returns void language plpgsql as $$
begin
  if p_amount <= 0 then raise exception 'invalid_amount'; end if;
  insert into ledger_entries (txn_id, at, booking_id, brand_id, creator_id, account, amount_cents, kind) values
    (p_txn, p_at, p_booking, p_brand, p_creator, p_from, -p_amount, p_kind),
    (p_txn, p_at, p_booking, p_brand, p_creator, p_to,    p_amount, p_kind);
  if p_from = 'brand_wallet'     then update brands   set wallet_cents  = wallet_cents  - p_amount where id = p_brand;   end if;
  if p_to   = 'brand_wallet'     then update brands   set wallet_cents  = wallet_cents  + p_amount where id = p_brand;   end if;
  if p_to   = 'creator_balance'  then update creators set balance_cents = balance_cents + p_amount where id = p_creator; end if;
  if p_from = 'creator_balance'  then update creators set balance_cents = balance_cents - p_amount where id = p_creator; end if;
end $$;

create or replace function app._lock_booking(p_booking uuid, p_from booking_status[]) returns bookings language plpgsql as $$
declare b bookings;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'booking_not_found' using errcode = 'P0002'; end if;
  if not (b.status = any (p_from)) then
    raise exception 'invalid_state' using detail = format('booking is %s, expected one of %s', b.status, p_from);
  end if;
  return b;
end $$;

-- return whatever is still held in escrow for this booking to the brand's wallet
create or replace function app._refund(p_booking uuid) returns void language plpgsql as $$
declare b bookings; c campaigns; held int;
begin
  select * into b from bookings where id = p_booking;
  select * into c from campaigns where id = b.campaign_id;
  select coalesce(sum(amount_cents), 0) into held from ledger_entries where booking_id = p_booking and account = 'escrow';
  if held > 0 then
    perform app._move(gen_random_uuid(), 'refund', 'escrow', 'brand_wallet', held, c.brand_id, b.creator_id, b.id);
  end if;
end $$;

-- ---------- transitions ----------

create or replace function app._accept(p_booking uuid, p_actor uuid) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['invited']::booking_status[]); cr creators; c campaigns; br brands;
begin
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  select * into br from brands where id = c.brand_id;
  update bookings set status = 'accepted', responded_at = now(), updated_at = now(),
         auto_at = case when cr.is_sandbox then now() + app._delay(b.id::text || 'draft', 15, 25) end
   where id = b.id;
  perform app._event(b.id, p_actor, 'offer_accepted');
  perform app._notify(br.owner_id, 'offer_accepted', b.id, cr.display_name || ' accepted your offer for ' || c.title);
end $$;

create or replace function app._decline(p_booking uuid, p_actor uuid, p_reason text) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['invited']::booking_status[]); cr creators; c campaigns; br brands;
begin
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  select * into br from brands where id = c.brand_id;
  update bookings set status = 'declined', responded_at = now(), updated_at = now(), auto_at = null where id = b.id;
  perform app._refund(b.id);
  perform app._event(b.id, p_actor, 'offer_declined', p_reason);
  perform app._notify(br.owner_id, 'offer_declined', b.id, cr.display_name || ' declined your offer for ' || c.title || '. The hold was returned to your wallet.');
end $$;

create or replace function app._submit_draft(p_booking uuid, p_actor uuid, p_text text) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['accepted','changes_requested']::booking_status[]); cr creators; c campaigns; br brands;
begin
  if p_text is null or length(btrim(p_text)) < 20 then raise exception 'draft_too_short' using detail = 'A draft needs at least 20 characters.'; end if;
  if length(p_text) > 5000 then raise exception 'draft_too_long'; end if;
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  select * into br from brands where id = c.brand_id;
  update bookings set status = 'drafted', draft_text = p_text, draft_version = draft_version + 1,
         submitted_at = now(), updated_at = now(), auto_at = null
   where id = b.id;
  perform app._event(b.id, p_actor, 'draft_submitted', null, jsonb_build_object('version', b.draft_version + 1));
  perform app._notify(br.owner_id, 'draft_submitted', b.id, cr.display_name || ' submitted a draft for ' || c.title);
end $$;

create or replace function app._request_changes(p_booking uuid, p_actor uuid, p_note text) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['drafted']::booking_status[]); cr creators; c campaigns;
begin
  if p_note is null or length(btrim(p_note)) < 5 then raise exception 'note_required' using detail = 'Say what should change (at least 5 characters).'; end if;
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  update bookings set status = 'changes_requested', updated_at = now(),
         auto_at = case when cr.is_sandbox then now() + app._delay(b.id::text || 'redraft', 12, 10) end
   where id = b.id;
  perform app._event(b.id, p_actor, 'changes_requested', p_note, '{}', 'brand');
  perform app._notify(cr.account_id, 'changes_requested', b.id, 'Changes requested on your draft for ' || c.title);
end $$;

create or replace function app._approve(p_booking uuid, p_actor uuid) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['drafted']::booking_status[]); cr creators; c campaigns;
begin
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  update bookings set status = 'approved', approved_at = now(), updated_at = now(),
         auto_at = case when cr.is_sandbox then now() + app._delay(b.id::text || 'live', 15, 10) end
   where id = b.id;
  perform app._event(b.id, p_actor, 'draft_approved', null, '{}', 'brand');
  perform app._notify(cr.account_id, 'draft_approved', b.id, 'Your draft for ' || c.title || ' was approved. Post it and add the link.');
end $$;

create or replace function app._mark_live(p_booking uuid, p_actor uuid, p_url text) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['approved']::booking_status[]); cr creators; c campaigns; br brands;
begin
  if p_url is null or p_url !~* '^https?://[^\s]+\.[^\s]+$' then
    raise exception 'invalid_url' using detail = 'Enter the full link to the published post, starting with https://';
  end if;
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  select * into br from brands where id = c.brand_id;
  update bookings set status = 'live', post_url = p_url, live_at = now(), updated_at = now(), auto_at = null where id = b.id;
  perform app._event(b.id, p_actor, 'went_live', null, jsonb_build_object('post_url', p_url));
  perform app._notify(br.owner_id, 'went_live', b.id, cr.display_name || ' went live for ' || c.title);
end $$;

create or replace function app._release(p_booking uuid, p_actor uuid) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['live']::booking_status[]); cr creators; c campaigns; held int;
begin
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  select coalesce(sum(amount_cents), 0) into held from ledger_entries where booking_id = b.id and account = 'escrow';
  if held <> b.price_cents then raise exception 'escrow_mismatch' using detail = format('held %s, price %s', held, b.price_cents); end if;
  perform app._move(gen_random_uuid(), 'release', 'escrow', 'creator_balance', held, c.brand_id, b.creator_id, b.id);
  update bookings set status = 'paid', paid_at = now(), updated_at = now() where id = b.id;
  perform app._event(b.id, p_actor, 'payout_released', null, jsonb_build_object('amount_cents', held), 'brand');
  perform app._notify(cr.account_id, 'payout_released', b.id, 'You were paid ' || to_char(held / 100.0, 'FM999G999D00') || ' EUR for ' || c.title);
end $$;

create or replace function app._cancel(p_booking uuid, p_actor uuid) returns void language plpgsql as $$
declare b bookings := app._lock_booking(p_booking, array['invited','accepted','drafted','changes_requested','approved']::booking_status[]);
        cr creators; c campaigns;
begin
  select * into cr from creators where id = b.creator_id;
  select * into c  from campaigns where id = b.campaign_id;
  update bookings set status = 'cancelled', updated_at = now(), auto_at = null where id = b.id;
  perform app._refund(b.id);
  perform app._event(b.id, p_actor, 'cancelled', null, '{}', 'brand');
  perform app._notify(cr.account_id, 'cancelled', b.id, 'The offer for ' || c.title || ' was cancelled');
end $$;

-- ---------- sandbox creators ----------

create or replace function app._sandbox_draft(p_booking uuid) returns text language sql stable as $$
  select format(E'Most teams I talk to in %s hit the same wall: %s\n\nHere is how %s approaches it, in plain terms. Worth ten minutes if this is on your list this quarter.\n\nLink in the first comment.',
                coalesce(cr.verticals[1], 'B2B'),
                coalesce(nullif(btrim(c.key_messages), ''), 'the tooling gets in the way of the work'),
                br.company_name)
  from bookings b
  join creators cr on cr.id = b.creator_id
  join campaigns c on c.id = b.campaign_id
  join brands br on br.id = c.brand_id
  where b.id = p_booking
$$;

create or replace function app._sandbox_url(p_booking uuid) returns text language sql stable as $$
  select 'https://example.com/sandbox-post/' || cr.handle || '-' || b.tracking_code
  from bookings b join creators cr on cr.id = b.creator_id where b.id = p_booking
$$;

-- plausible, clearly-seeded performance for a sandbox creator's post
create or replace function app._seed_stats(p_booking uuid) returns void language plpgsql as $$
declare cr creators; imp int;
begin
  select cr2.* into cr from bookings b join creators cr2 on cr2.id = b.creator_id where b.id = p_booking;
  imp := round(cr.imp_p50 * (0.8 + 0.4 * app._h(p_booking::text || 'imp')));
  insert into post_stats (booking_id, impressions, reactions, comments, source)
  values (p_booking, imp, round(imp * 0.03), round(imp * 0.004), 'seeded')
  on conflict (booking_id) do nothing;
  perform app._event(p_booking, null, 'stats_reported', null, jsonb_build_object('impressions', imp), 'system');
end $$;
