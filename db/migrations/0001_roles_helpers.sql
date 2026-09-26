-- 0001 · roles and helpers.
-- Portable on any Postgres 15+ (local, Supabase, Neon). Deliberately uses NO extensions.
--
-- Access model: the server connects with one login role (the owner), and for every user request runs
--   SET LOCAL ROLE byline_user;  SELECT set_config('app.user_id', '<uuid>', true);
-- so row-level security applies to that user. Signed-out visitors run as byline_anon.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'byline_anon') then create role byline_anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'byline_user') then create role byline_user nologin; end if;
end $$;

-- the login role must be able to SET ROLE into both
do $$ begin execute format('grant byline_anon, byline_user to %I', current_user); end $$;

create schema if not exists app;
grant usage on schema app to byline_anon, byline_user;

-- The signed-in account for this transaction (NULL when signed out).
create or replace function app.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;
grant execute on function app.uid() to byline_anon, byline_user;

-- Deterministic pseudo-random number in [0,1] from a string. Used for seed data and sandbox-creator timing.
create or replace function app._h(t text) returns numeric language sql immutable as $$
  select (('x' || substr(md5(t), 1, 8))::bit(32)::bigint)::numeric / 4294967295
$$;

-- 8-character, unambiguous tracking code (no 0/1/i/l/o), from the built-in UUID generator.
create or replace function app._new_code() returns text language plpgsql volatile as $$
declare
  alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  bytes bytea;
  code text;
  i int;
begin
  loop
    bytes := uuid_send(gen_random_uuid());
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where tracking_code = code);
  end loop;
  return code;
end $$;
