-- Receipts are public only while live/paid AND not revoked, and only the owning brand can change that.
do $$
declare ba uuid; bb uuid; xa uuid; camp uuid; b1 uuid; v_code text;
begin
  ba := app_test.mk_brand('a@t.test', 'Brand A');  bb := app_test.mk_brand('b@t.test', 'Brand B');
  xa := app_test.mk_creator('creator-x', false, 100000);
  perform app_test.as_user(ba);
  perform top_up_wallet(500000);
  camp := create_campaign('Receipts', '{}', 'demos', 'https://example.com/lp', '', '', 0, null);
  perform place_hold(camp, array[app_test.cid('creator-x')]);
  perform app_test.as_owner();
  b1 := (select id from bookings limit 1);  v_code := (select tracking_code from bookings where id = b1);

  perform app_test.as_anon();
  assert (select count(*) from public_receipts) = 0, 'no receipt while the offer is only invited';
  perform app_test.as_owner();
  perform app._accept(b1, null); perform app._submit_draft(b1, null, 'A draft that is long enough to pass the validation rule.');
  perform app._approve(b1, null); perform app._mark_live(b1, null, 'https://www.example.com/post/1');
  perform record_click(b1, 'v1', 'human', 'FR', 'linkedin.com');

  perform app_test.as_anon();
  assert (select count(*) from public_receipts where code = v_code) = 1, 'live post: receipt is public';
  assert (select clicks_unique from public_receipts where code = v_code) = 1, 'with its verified click';
  assert (select status from public_receipts where code = v_code) = 'live', 'and reads "live", not "paid"';

  perform app_test.as_user(bb);
  perform app_test.expect(format('select set_receipt_public(%L, false)', b1), 'forbidden');
  perform app_test.as_user(xa);
  perform app_test.expect(format('select set_receipt_public(%L, false)', b1), 'not_a_brand');
  perform app_test.as_user(ba);
  perform set_receipt_public(b1, false);
  perform app_test.as_anon();
  assert (select count(*) from public_receipts) = 0, 'a revoked receipt disappears from the public view';
  perform app_test.as_user(ba);
  perform set_receipt_public(b1, true);
  perform release_payout(b1);
  perform app_test.as_anon();
  assert (select status from public_receipts where code = v_code) = 'paid', 'restored, and now paid';
  assert (select count(*) from public_receipts where code = 'zzzzzzzz') = 0, 'unknown code: nothing';
end $$;
