-- Every legal transition works and is recorded; every illegal one is refused; refunds and payouts move the right money.
do $$
declare ba uuid; bb uuid; bid uuid; xa uuid; ya uuid; camp uuid; camp_b uuid; b1 uuid; b2 uuid; b3 uuid; r jsonb;
begin
  ba := app_test.mk_brand('a@t.test', 'Brand A'); bid := app_test.bid(ba);
  bb := app_test.mk_brand('b@t.test', 'Brand B');
  xa := app_test.mk_creator('creator-x', false, 100000);
  ya := app_test.mk_creator('creator-y', false, 80000);

  perform app_test.as_user(ba);
  perform top_up_wallet(1000000);
  camp := create_campaign('Launch', '{}', 'demos', 'https://example.com/lp', 'Say it plainly', '', 500000, null);
  r := place_hold(camp, array[app_test.cid('creator-x'), app_test.cid('creator-y')]);
  perform app_test.as_owner();
  b1 := (select id from bookings where creator_id = app_test.cid('creator-x'));
  b2 := (select id from bookings where creator_id = app_test.cid('creator-y'));

  -- illegal from 'invited'
  perform app_test.as_user(ba);
  perform app_test.expect(format('select approve_draft(%L)', b1), 'invalid_state');
  perform app_test.expect(format('select release_payout(%L)', b1), 'invalid_state');
  perform app_test.as_user(xa);
  perform app_test.expect(format('select approve_draft(%L)', b1), 'not_a_brand');       -- a creator cannot use brand RPCs
  perform app_test.expect(format('select mark_live(%L, %L)', b1, 'https://x.example.com/p'), 'invalid_state');
  perform app_test.expect(format('select accept_offer(%L)', b2), 'forbidden');           -- not their booking
  perform accept_offer(b1);
  perform app_test.expect(format('select accept_offer(%L)', b1), 'invalid_state');        -- no double accept
  perform app_test.expect(format('select submit_draft(%L, %L)', b1, 'too short'), 'draft_too_short');
  perform submit_draft(b1, 'A first draft that is comfortably longer than twenty characters.');

  perform app_test.as_user(ba);
  perform app_test.expect(format('select request_changes(%L, %L)', b1, 'no'), 'note_required');
  perform request_changes(b1, 'Please shorten the intro.');
  perform app_test.as_user(xa);
  perform app_test.expect(format('select mark_live(%L, %L)', b1, 'https://x.example.com/p'), 'invalid_state');   -- not approved yet
  perform submit_draft(b1, 'A second draft, shorter intro and one clear next step for the reader.');
  perform app_test.as_owner();
  assert (select draft_version from bookings where id = b1) = 2, 'draft version increments on resubmission';

  perform app_test.as_user(bb);   -- another brand cannot touch it
  perform app_test.expect(format('select approve_draft(%L)', b1), 'forbidden');
  perform app_test.as_user(ba);
  perform approve_draft(b1);
  perform app_test.as_user(xa);
  perform app_test.expect(format('select mark_live(%L, %L)', b1, 'not a url'), 'invalid_url');
  perform mark_live(b1, 'https://www.example.com/posts/1');
  perform app_test.as_user(ba);
  perform app_test.expect(format('select cancel_booking(%L)', b1), 'invalid_state');    -- cannot cancel a live post
  perform release_payout(b1);
  perform app_test.expect(format('select release_payout(%L)', b1), 'invalid_state');    -- no double payout
  perform app_test.as_owner();

  assert app_test.status(b1) = 'paid', 'ends paid';
  assert (select balance_cents from creators where id = app_test.cid('creator-x')) = 100000, 'creator paid the full price';
  assert (select coalesce(sum(amount_cents),0) from ledger_entries where booking_id = b1 and account = 'escrow') = 0, 'escrow empty after payout';
  assert (select array_agg(kind order by id) from booking_events where booking_id = b1) =
         array['offer_sent','offer_accepted','draft_submitted','changes_requested','draft_submitted','draft_approved','went_live','payout_released'],
         'event history is complete and in order';
  assert (select count(*) from notifications where account_id = xa) >= 3, 'the creator was notified along the way';

  -- decline refunds the hold
  perform app_test.as_user(ya);
  perform decline_offer(b2, 'Not a fit');
  perform app_test.as_owner();
  assert app_test.status(b2) = 'declined', 'declined';
  assert (select coalesce(sum(amount_cents),0) from ledger_entries where booking_id = b2 and account = 'escrow') = 0, 'declined offer releases its escrow';

  -- cancel (from accepted) refunds too
  perform app_test.as_user(ba);
  camp_b := create_campaign('Second', '{}', 'signups', 'https://example.com/two', '', '', 0, null);
  perform place_hold(camp_b, array[app_test.cid('creator-y')]);
  perform app_test.as_owner();
  b3 := (select id from bookings where campaign_id = camp_b);
  perform app_test.as_user(ya); perform accept_offer(b3);
  perform app_test.as_user(ba); perform cancel_booking(b3);
  perform app_test.as_owner();
  assert app_test.status(b3) = 'cancelled', 'cancelled';
  assert (select wallet_cents from brands where id = bid) = 1000000 - 100000, 'wallet is whole again: only the paid post is spent';
  assert not exists (select 1 from ledger_entries group by txn_id having sum(amount_cents) <> 0), 'ledger still nets to zero after all of it';
  assert (select wallet_cents from brands where id = bid) = (select sum(amount_cents) from ledger_entries where account = 'brand_wallet' and brand_id = bid), 'wallet cache equals the ledger';
end $$;
