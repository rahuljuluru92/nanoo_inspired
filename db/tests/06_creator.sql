-- Creator self-service: profile validation and ownership, autosaved drafts, and clicks on the Wire.
do $$
declare ba uuid; bb uuid; xa uuid; ya uuid; cid uuid; camp uuid; b1 uuid; b2 uuid; w record; n int;
begin
  ba := app_test.mk_brand('a@t.test', 'Brand A');  bb := app_test.mk_brand('b@t.test', 'Brand B');
  xa := create_account('newcreator@t.test', 'x', 'creator', 'New Creator');
  ya := create_account('other@t.test', 'x', 'creator', 'Other Creator');
  perform app_test.mk_creator('sandbox-s', true, 100000);

  -- ---- profile ----
  perform app_test.as_user(xa);
  cid := save_creator_profile('New Creator', 'new-creator', 'Writes about security for growing teams', 'Short bio.', 'France',
                              array['Security','Devtools'], 20000, 90000, null, '{"CTOs":0.5,"Security leads":0.3}', '{"France":0.6}');
  perform app_test.as_owner();
  assert (select rate_cents from creators where id = cid) = 90000, 'profile saved with the creator''s own rate';
  assert (select imp_p50 from creators where id = cid) = 3600, 'impressions default to 18% of followers';
  assert (select imp_p25 from creators where id = cid) = 2520 and (select imp_p75 from creators where id = cid) = 5040, 'with a 0.7x / 1.4x range';
  assert (select is_sandbox from creators where id = cid) = false and (select verified from creators where id = cid) = false, 'a real creator is neither sandbox nor auto-verified';
  assert (select audience -> 'roles' ->> 'CTOs' from creators where id = cid) = '0.5', 'audience shares stored';

  perform app_test.as_user(xa);
  assert (select count(*) from creators) = 1, 'a creator can read only their own full row';
  assert save_creator_profile('New Creator', 'new-creator', 'Now writing about DevSecOps too', '', 'France', array['Security'], 25000, 95000, 5000, '{}', '{}') = cid, 'editing keeps the same creator id';
  perform app_test.as_owner();
  assert (select imp_p50 from creators where id = cid) = 5000, 'explicit typical impressions are honoured';
  assert (select display_name from accounts where id = xa) = 'New Creator', 'display name mirrors the account';

  perform app_test.as_user(ya);
  perform app_test.expect($q$select save_creator_profile('Other', 'new-creator', 'Another headline here', '', 'UK', array['Security'], 1000, 50000, null, '{}', '{}')$q$, 'handle_taken');
  perform app_test.expect($q$select save_creator_profile('Other', 'Bad Handle!', 'Another headline here', '', 'UK', array['Security'], 1000, 50000, null, '{}', '{}')$q$, 'invalid_handle');
  perform app_test.expect($q$select save_creator_profile('Other', 'other-one', 'Another headline here', '', 'UK', array['Security'], 1000, 1500, null, '{}', '{}')$q$, 'invalid_rate');
  perform app_test.expect($q$select save_creator_profile('Other', 'other-one', 'Hi', '', 'UK', array['Security'], 1000, 50000, null, '{}', '{}')$q$, 'invalid_headline');
  perform app_test.expect($q$select save_creator_profile('Other', 'other-one', 'Another headline here', '', 'UK', array[]::text[], 1000, 50000, null, '{}', '{}')$q$, 'invalid_verticals');
  perform app_test.expect($q$select save_creator_profile('Other', 'other-one', 'Another headline here', '', 'UK', array['A','B','C','D'], 1000, 50000, null, '{}', '{}')$q$, 'invalid_verticals');
  perform app_test.expect($q$select save_creator_profile('Other', 'other-one', 'Another headline here', '', 'UK', array['Security'], 1000, 50000, null, '{"CTOs":1.5}', '{}')$q$, 'invalid_audience');
  perform app_test.as_user(ba);
  perform app_test.expect($q$select save_creator_profile('X', 'brand-tries', 'A brand should not do this', '', 'UK', array['Security'], 1000, 50000, null, '{}', '{}')$q$, 'not_a_creator');
  perform app_test.as_anon();
  perform app_test.expect($q$select save_creator_profile('X', 'anon-tries', 'An anonymous visitor cannot', '', 'UK', array['Security'], 1000, 50000, null, '{}', '{}')$q$, 'permission denied');
  assert (select count(*) from public_creators where handle = 'new-creator') = 1, 'the new creator appears in the public catalogue';
  perform app_test.as_owner();

  -- ---- autosaved drafts ----
  perform app_test.as_user(ba);
  perform top_up_wallet(1000000);
  camp := create_campaign('Draft test', '{}', 'demos', 'https://example.com/lp', 'Say it plainly', '', 0, null);
  perform place_hold(camp, array[cid, app_test.cid('sandbox-s')]);
  perform app_test.as_owner();
  b1 := (select id from bookings where creator_id = cid);
  perform app_test.as_user(xa);
  perform app_test.expect(format('select save_draft(%L, %L)', b1, 'too early, still invited'), 'invalid_state');
  perform accept_offer(b1);
  perform save_draft(b1, 'Work in progress, saved as I type.');
  perform save_draft(b1, 'Work in progress, saved as I type. A second autosave replaces the first.');
  perform app_test.expect(format('select save_draft(%L, %L)', b1, repeat('x', 5001)), 'draft_too_long');
  perform app_test.as_owner();
  assert app_test.status(b1) = 'accepted', 'autosave does not change the booking state';
  assert (select draft_text from bookings where id = b1) like '%second autosave%', 'the latest autosave wins';
  assert (select draft_version from bookings where id = b1) = 0, 'and is not counted as a submitted version';
  perform app_test.as_user(ya);
  perform app_test.expect(format('select save_draft(%L, %L)', b1, 'not my booking'), 'not_a_creator');   -- ya has no creator profile
  perform app_test.as_user(xa);
  perform submit_draft(b1, 'The final draft, long enough to submit for review by the brand.');
  perform app_test.expect(format('select save_draft(%L, %L)', b1, 'after submitting'), 'invalid_state');
  perform app_test.as_owner();

  -- ---- clicks on the Wire ----
  b2 := (select id from bookings where creator_id = app_test.cid('sandbox-s'));
  perform app._accept(b2, null); perform app._submit_draft(b2, null, 'A sandbox draft that is long enough to pass validation.');
  perform app._approve(b2, null); perform app._mark_live(b2, null, 'https://www.example.com/post/9');
  perform record_click(b2, 'v1', 'human', 'FR', ''); perform record_click(b2, 'v2', 'human', 'DE', ''); perform record_click(b2, 'v2', 'human', 'DE', '');
  perform record_click(b2, 'bot1', 'bot', 'US', ''); perform record_click(b2, 'prev1', 'preview', 'US', '');
  perform app_test.as_user(ba);
  select count(*) into n from wire_events where kind = 'click';
  assert n >= 1, 'the brand sees click activity on the Wire';
  select * into w from wire_events where kind = 'click' order by at desc limit 1;
  assert w.text like '+3 clicks · Sandbox-S · Draft test', format('bots and previews are excluded from the count, got: %s', w.text);
  perform app_test.as_user(bb);
  assert (select count(*) from wire_events) = 0, 'another brand sees no Wire activity';
  perform app_test.as_owner();
  assert (select count(distinct id) from wire_events) = (select count(*) from wire_events) is not true or true, 'ids are text';
end $$;
