-- Test harness, prepended to every suite. Each suite runs in ONE transaction that is rolled back, so nothing persists.
create schema app_test;
grant usage on schema app_test to byline_anon, byline_user;

-- run a statement under the CURRENT role and require it to fail with a message containing p_needle
create function app_test.expect(p_sql text, p_needle text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_needle in sqlerrm) = 0 and position(p_needle in coalesce(sqlstate, '')) = 0 then
      raise exception 'expected an error containing "%", got: % (%)', p_needle, sqlerrm, sqlstate;
    end if;
    return;
  end;
  raise exception 'expected an error containing "%", but the statement succeeded: %', p_needle, p_sql;
end $$;

create function app_test.as_user(p uuid) returns void language plpgsql as $$
begin perform set_config('app.user_id', p::text, true); execute 'reset role'; execute 'set local role byline_user'; end $$;
create function app_test.as_anon() returns void language plpgsql as $$
begin perform set_config('app.user_id', '', true); execute 'reset role'; execute 'set local role byline_anon'; end $$;
create function app_test.as_owner() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('app.user_id', '', true); end $$;
grant execute on all functions in schema app_test to byline_anon, byline_user;

-- fixtures (called as owner) -------------------------------------------------
create function app_test.mk_brand(p_email text, p_company text) returns uuid language sql as $$
  select create_account(p_email, 'x', 'brand', p_company, p_company)
$$;
-- returns the creator's ACCOUNT id; sandbox creators have no account
create function app_test.mk_creator(p_handle text, p_sandbox boolean, p_rate int) returns uuid language plpgsql as $$
declare a uuid;
begin
  if not p_sandbox then a := create_account(p_handle || '@t.test', 'x', 'creator', p_handle); end if;
  insert into creators (handle, display_name, account_id, rate_cents, is_sandbox, verticals, followers, imp_p25, imp_p50, imp_p75, ctr_p50)
  values (p_handle, initcap(p_handle), a, p_rate, p_sandbox, array['Security'], 10000, 1000, 2000, 3000, 1.5);
  return a;
end $$;
-- lookups must see everything, so they run as the owner even when a suite is acting as a user (RLS would hide the rows)
create function app_test.cid(p_handle text) returns uuid language sql security definer set search_path = public, pg_temp as $$ select id from creators where handle = p_handle $$;
create function app_test.bid(p_account uuid) returns uuid language sql security definer set search_path = public, pg_temp as $$ select id from brands where owner_id = p_account $$;
create function app_test.status(p_booking uuid) returns booking_status language sql security definer set search_path = public, pg_temp as $$ select status from bookings where id = p_booking $$;
