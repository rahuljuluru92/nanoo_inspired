-- Click tracking: only live/paid posts count, crawlers never count, uniqueness is per visitor, receipts are gated.
do $$
declare ba uuid; bb uuid; b1 uuid; b2 uuid; camp uuid; v_code text; m record; l jsonb;
begin
  ba := app_test.mk_brand('a@t.test', 'Brand A');  bb := app_test.mk_brand('b@t.test', 'Brand B');
  perform app_test.mk_creator('creator-s', true, 100000);
  perform app_test.mk_creator('creator-t', true, 90000);
  perform app_test.as_user(ba);
  perform top_up_wallet(500000);
  camp := create_campaign('Tracked', '{}', 'demos', 'https://example.com/landing', 'k', 'g', 0, null);
  perform place_hold(camp, array[app_test.cid('creator-s'), app_test.cid('creator-t')]);
  perform app_test.as_owner();
  b1 := (select id from bookings where creator_id = app_test.cid('creator-s'));
  b2 := (select id from bookings where creator_id = app_test.cid('creator-t'));
  v_code := (select tracking_code from bookings where id = b1);
  assert v_code ~ '^[2-9a-hjkmnp-z]{8}$', 'tracking code is 8 unambiguous characters';

  l := link_lookup(v_code);
  assert l ->> 'destination_url' = 'https://example.com/landing', 'lookup returns the campaign destination';
  assert link_lookup('zzzzzzzz') is null, 'unknown code returns null';

  -- before the post is live nothing is counted
  perform record_click(b1, 'h1', 'human', 'FR', 'linkedin.com');
  assert (select count(*) from tracking_events) = 0, 'clicks on a not-yet-live booking are ignored';
  assert (select count(*) from public_receipts) = 0, 'no receipt while invited';

  -- take b1 live using the internal transitions
  perform app._accept(b1, null);
  perform app._submit_draft(b1, null, 'A perfectly reasonable draft that is long enough to pass.');
  perform app._approve(b1, null);
  perform app._mark_live(b1, null, 'https://www.example.com/post/1');

  perform record_click(b1, 'visitor-1', 'human', 'FR', 'linkedin.com');
  perform record_click(b1, 'visitor-2', 'human', 'DE', 't.co');
  perform record_click(b1, 'visitor-3', 'human', 'GB', 'linkedin.com');
  perform record_click(b1, 'visitor-3', 'human', 'GB', 'linkedin.com');   -- the same visitor again
  perform record_click(b1, 'visitor-3', 'human', 'GB', 'linkedin.com');
  perform record_click(b1, 'crawler-1', 'bot', 'US', '');
  perform record_click(b1, 'crawler-2', 'bot', 'US', '');
  perform record_click(b1, 'unfurl-1', 'preview', 'US', '');
  perform record_click(b1, 'evil', 'not-a-class', 'US', '');              -- invalid class is dropped
  perform record_click(b2, 'visitor-9', 'human', 'FR', '');               -- b2 is still only invited

  select * into m from booking_metrics_all where booking_id = b1;
  assert m.clicks_total = 5, 'five human clicks counted (bots and previews excluded)';
  assert m.clicks_unique = 3, 'three unique visitors';
  assert (select count(*) from tracking_events where booking_id = b2) = 0, 'no clicks recorded against an invited booking';
  assert (select count(*) from tracking_events where ua_class <> 'human') = 3, 'crawlers are stored but flagged';

  -- the brand sees the metrics; another brand does not
  perform app_test.as_user(ba);
  assert (select clicks_unique from booking_metrics where booking_id = b1) = 3, 'owner reads unique clicks';
  perform app_test.as_user(bb);
  assert (select count(*) from booking_metrics) = 0, 'other brand sees no metrics';
  perform app_test.as_anon();
  assert (select clicks_unique from public_receipts where code = v_code) = 3, 'public receipt shows verified unique clicks';
  assert (select count(*) from public_receipts) = 1, 'only the live booking has a receipt';
  perform app_test.as_owner();

  -- a brand can revoke its receipt
  update bookings set receipt_public = false where id = b1;
  perform app_test.as_anon();
  assert (select count(*) from public_receipts) = 0, 'a revoked receipt disappears';
end $$;
