-- Isolation: each role sees only what it should, cannot write around the RPCs, and cannot call internals.
do $$
declare ba uuid; bb uuid; xa uuid; ya uuid; camp uuid; b1 uuid;
begin
  ba := app_test.mk_brand('a@t.test', 'Brand A');  bb := app_test.mk_brand('b@t.test', 'Brand B');
  xa := app_test.mk_creator('creator-x', false, 100000);  ya := app_test.mk_creator('creator-y', false, 80000);
  perform app_test.as_user(ba);
  perform top_up_wallet(500000);
  camp := create_campaign('Secret budget campaign', '{}', 'demos', 'https://example.com/a', 'k', 'g', 123456, null);
  perform place_hold(camp, array[app_test.cid('creator-x')]);
  perform app_test.as_owner();
  b1 := (select id from bookings limit 1);

  -- another brand sees none of it
  perform app_test.as_user(bb);
  assert (select count(*) from bookings) = 0, 'other brand: no bookings';
  assert (select count(*) from campaigns) = 0, 'other brand: no campaigns';
  assert (select count(*) from booking_events) = 0, 'other brand: no events';
  assert (select count(*) from ledger_entries) = 0, 'other brand: no ledger';
  assert (select count(*) from wire_events) = 0, 'other brand: empty wire';
  assert (select count(*) from booking_metrics) = 0, 'other brand: no metrics';
  assert (select count(*) from notifications) = 0, 'other brand: no notifications';
  assert (select count(*) from brands) = 1, 'a brand can read only its own brand row';
  assert (select count(*) from accounts) = 1, 'a user can read only their own account row';

  -- an unrelated creator sees none of it
  perform app_test.as_user(ya);
  assert (select count(*) from bookings) = 0 and (select count(*) from my_offers) = 0 and (select count(*) from wire_events) = 0, 'unrelated creator sees nothing';

  -- the booked creator sees the offer, but never the brand's budget or wallet legs
  perform app_test.as_user(xa);
  assert (select count(*) from bookings) = 1, 'booked creator sees their booking';
  assert (select brand_name from my_offers) = 'Brand A', 'and the offer with the brand name';
  assert (select count(*) from campaigns) = 0, 'but cannot read the campaigns table (budget stays private)';
  assert not exists (select 1 from information_schema.columns where table_name = 'my_offers' and column_name = 'budget_cents'), 'my_offers exposes no budget';
  assert (select count(*) from ledger_entries) = 0, 'creator sees no brand wallet or escrow legs';
  assert (select count(*) from notifications) = 1, 'creator has their offer notification';

  -- the owning brand sees everything of its own
  perform app_test.as_user(ba);
  assert (select count(*) from bookings) = 1 and (select count(*) from campaigns) = 1, 'owner sees own data';
  assert (select count(*) from wire_events) >= 1, 'owner has wire events';
  assert (select count(*) from ledger_entries where account = 'brand_wallet') >= 2, 'owner sees own ledger';

  -- secrets are unreachable even for the owner of the row
  perform app_test.expect('select password_hash from accounts', 'permission denied');
  perform app_test.expect('select * from accounts', 'permission denied');
  perform app_test.expect('select ip_hash from tracking_events', 'permission denied');
  perform app_test.expect('select * from sessions', 'permission denied');

  -- no writing around the RPCs
  perform app_test.expect('update brands set wallet_cents = 99999999', 'permission denied');
  perform app_test.expect('update bookings set status = ''paid''', 'permission denied');
  perform app_test.expect('delete from bookings', 'permission denied');
  perform app_test.expect($q$insert into ledger_entries (txn_id, account, amount_cents, kind) values (gen_random_uuid(), 'brand_wallet', 500, 'topup')$q$, 'permission denied');
  perform app_test.expect('update creators set rate_cents = 2000', 'permission denied');

  -- internals and server-only functions are not callable
  perform app_test.expect(format('select app._approve(%L, null)', b1), 'permission denied');
  perform app_test.expect($q$select create_account('z@t.test', 'h', 'brand', 'n', 'c')$q$, 'permission denied');
  perform app_test.expect(format('select record_click(%L, %L, %L, %L, %L)', b1, 'h', 'human', 'FR', ''), 'permission denied');
  perform app_test.expect($q$select link_lookup('abcd2345')$q$, 'permission denied');
  perform app_test.expect('select reset_demo()', 'forbidden');    -- callable, but only demo accounts pass

  -- regression guard: NO function in public/app may be executable by PUBLIC (an ACL of NULL means the default: PUBLIC can execute)
  perform app_test.as_owner();
  assert not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'app') and p.prokind = 'f'
       and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'))
  ), 'a function is executable by PUBLIC: ' || coalesce((select string_agg(n.nspname || '.' || p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'app') and p.prokind = 'f' and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'))), '');

  -- signed out: public catalogue only
  perform app_test.as_anon();
  assert (select count(*) from public_creators) = 2, 'anon can read the public catalogue';
  perform app_test.expect('select * from bookings', 'permission denied');
  perform app_test.expect('select * from ledger_entries', 'permission denied');
  perform app_test.expect('select * from creators', 'permission denied');
  perform app_test.expect('select top_up_wallet(5000)', 'permission denied');
  perform app_test.expect('select * from accounts', 'permission denied');
  assert (select count(*) from public_receipts) = 0, 'no receipts before anything is live';
end $$;
