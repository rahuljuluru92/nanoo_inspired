-- Sandbox creators reply on their own, in order, without breaking any invariant, and only for the brand that asks.
do $$
declare ba uuid; bb uuid; bid uuid; camp uuid; ids uuid[] := '{}'; h text; n int; b uuid; accepted uuid[];
begin
  ba := app_test.mk_brand('a@t.test', 'Brand A');  bid := app_test.bid(ba);  bb := app_test.mk_brand('b@t.test', 'Brand B');
  foreach h in array array['sb-1','sb-2','sb-3','sb-4','sb-5','sb-6'] loop
    perform app_test.mk_creator(h, true, 100000);  ids := ids || app_test.cid(h);
  end loop;
  perform app_test.mk_creator('real-one', false, 100000);

  perform app_test.as_user(ba);
  perform top_up_wallet(2000000);
  camp := create_campaign('Sandbox run', '{}', 'demos', 'https://example.com/lp', 'Ship it', '', 0, null);
  perform place_hold(camp, ids || app_test.cid('real-one'));
  assert sandbox_tick() = 0, 'nobody replies instantly';
  perform app_test.as_owner();
  assert (select count(*) from bookings where auto_at is not null) = 6, 'only sandbox creators are scheduled';
  assert (select auto_at from bookings where creator_id = app_test.cid('real-one')) is null, 'a real creator is never automated';

  -- another brand ticking does not advance our bookings
  update bookings set auto_at = now() - interval '1 second' where auto_at is not null;
  perform app_test.as_user(bb);
  assert sandbox_tick() = 0, 'another brand cannot advance our bookings';
  perform app_test.as_owner();
  assert (select count(*) from bookings where status = 'invited') = 7, 'nothing moved';

  -- invited -> accepted | declined
  perform app_test.as_user(ba);
  n := sandbox_tick();
  perform app_test.as_owner();
  assert n = 6, 'all six sandbox creators replied';
  assert (select count(*) from bookings where status in ('accepted','declined') and creator_id = any (ids)) = 6, 'each accepted or declined';
  assert (select coalesce(sum(amount_cents),0) from ledger_entries l join bookings b on b.id = l.booking_id
          where b.status = 'declined' and l.account = 'escrow') = 0, 'declines refunded their escrow';
  select array_agg(id) into accepted from bookings where status = 'accepted';
  assert accepted is not null, 'at least one accepted (the odds of six declines are ~1e-5)';

  -- accepted -> drafted
  update bookings set auto_at = now() - interval '1 second' where id = any (accepted);
  perform app_test.as_user(ba); perform sandbox_tick(); perform app_test.as_owner();
  assert (select count(*) from bookings where id = any (accepted) and status = 'drafted' and length(draft_text) >= 20) = cardinality(accepted), 'accepted creators drafted';

  -- brand approves; sandbox goes live with seeded stats
  b := accepted[1];
  perform app_test.as_user(ba); perform approve_draft(b); perform app_test.as_owner();
  assert (select auto_at from bookings where id = b) is not null, 'approval schedules the sandbox go-live';
  update bookings set auto_at = now() - interval '1 second' where id = b;
  perform app_test.as_user(ba); perform sandbox_tick(); perform app_test.as_owner();
  assert app_test.status(b) = 'live', 'sandbox went live';
  assert (select post_url from bookings where id = b) like 'https://example.com/sandbox-post/%', 'with a clearly-sandbox post URL';
  assert (select source from post_stats where booking_id = b) = 'seeded', 'stats are labelled as seeded';

  -- request changes -> sandbox redrafts
  if cardinality(accepted) > 1 then
    perform app_test.as_user(ba); perform request_changes(accepted[2], 'Tighten the opening line.'); perform app_test.as_owner();
    update bookings set auto_at = now() - interval '1 second' where id = accepted[2];
    perform app_test.as_user(ba); perform sandbox_tick(); perform app_test.as_owner();
    assert app_test.status(accepted[2]) = 'drafted' and (select draft_version from bookings where id = accepted[2]) = 2, 'redrafted after changes were requested';
  end if;

  perform app_test.as_user(ba); perform release_payout(b); perform app_test.as_owner();
  assert app_test.status(b) = 'paid', 'and gets paid';
  assert not exists (select 1 from ledger_entries group by txn_id having sum(amount_cents) <> 0), 'the ledger nets to zero after the whole sandbox run';
  assert (select wallet_cents from brands where id = bid) = (select sum(amount_cents) from ledger_entries where account = 'brand_wallet' and brand_id = bid), 'wallet cache equals the ledger';
end $$;
