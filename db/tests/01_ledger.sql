-- Money invariants: prices come from the database, every transaction nets to zero, failures leave no trace.
do $$
declare ba uuid; bid uuid; c1 uuid; camp uuid; camp2 uuid; r jsonb; n_before int; l_before int;
begin
  ba := app_test.mk_brand('brand@t.test', 'Brand Co');  bid := app_test.bid(ba);
  perform app_test.mk_creator('creator-one', true, 100000);
  perform app_test.mk_creator('creator-two', true, 250000);
  perform app_test.mk_creator('creator-big',  true, 900000);

  perform app_test.as_user(ba);
  assert top_up_wallet(500000) = 500000, 'top-up returns the new balance';
  camp := create_campaign('Test campaign', '{}', 'demos', 'https://example.com/x', 'msg', 'rules', 350000, null);
  r := place_hold(camp, array[app_test.cid('creator-one'), app_test.cid('creator-two')]);
  perform app_test.as_owner();

  assert (r ->> 'total_cents')::int = 350000, 'total is the sum of creators.rate_cents';
  assert (select wallet_cents from brands where id = bid) = 150000, 'wallet debited by the hold';
  assert (select sum(amount_cents) from ledger_entries where account = 'escrow') = 350000, 'escrow holds the total';
  assert (select price_cents from bookings where creator_id = app_test.cid('creator-one')) = 100000, 'booking price = creator rate (client cannot set it)';
  assert not exists (select 1 from ledger_entries group by txn_id having sum(amount_cents) <> 0), 'every ledger transaction nets to zero';
  assert (select wallet_cents from brands where id = bid) = (select sum(amount_cents) from ledger_entries where account = 'brand_wallet' and brand_id = bid), 'wallet cache equals the ledger';
  assert (select count(*) from bookings where campaign_id = camp and status = 'invited') = 2, 'two invited bookings';
  assert (select count(*) from booking_events where kind = 'offer_sent') = 2, 'an offer_sent event per booking';

  -- insufficient funds: a designed error, and NOTHING moves
  select count(*) into n_before from bookings; select count(*) into l_before from ledger_entries;
  perform app_test.as_user(ba);
  camp2 := create_campaign('Too big', '{}', 'demos', 'https://example.com/y', '', '', 0, null);
  perform app_test.expect(format('select place_hold(%L, array[%L]::uuid[])', camp2, app_test.cid('creator-big')), 'insufficient_funds');
  perform app_test.as_owner();
  assert (select count(*) from bookings) = n_before, 'a failed hold creates no booking';
  assert (select count(*) from ledger_entries) = l_before, 'a failed hold writes no ledger rows';
  assert (select wallet_cents from brands where id = bid) = 150000, 'a failed hold leaves the wallet untouched';

  -- input validation
  perform app_test.as_user(ba);
  perform app_test.expect('select top_up_wallet(500)', 'invalid_amount');
  perform app_test.expect('select top_up_wallet(999999999)', 'invalid_amount');
  perform app_test.expect(format('select place_hold(%L, array[%L]::uuid[])', camp, app_test.cid('creator-one')), 'already_booked');
  perform app_test.expect(format('select place_hold(%L, array[%L, %L]::uuid[])', camp2, app_test.cid('creator-one'), app_test.cid('creator-one')), 'unknown_creator');
  perform app_test.expect(format('select place_hold(%L, array[]::uuid[])', camp2), 'empty_lineup');
  perform app_test.expect(format('select place_hold(%L, array[gen_random_uuid()])', camp2), 'unknown_creator');
  perform app_test.expect($q$select create_campaign('x', '{}', 'demos', 'https://example.com', '', '', 0, null)$q$, 'invalid_title');
  perform app_test.expect($q$select create_campaign('Fine title', '{}', 'demos', 'not-a-url', '', '', 0, null)$q$, 'invalid_url');
  perform app_test.as_owner();

  -- the database itself refuses overdrafts and unbalanced ledgers, even for the owner
  perform app_test.expect(format('update brands set wallet_cents = -1 where id = %L', bid), 'wallet_cents');
  perform app_test.expect($q$insert into ledger_entries (txn_id, account, amount_cents, kind) values (gen_random_uuid(), 'brand_wallet', 100, 'topup'); set constraints ledger_balanced immediate$q$, 'ledger_unbalanced');
end $$;
