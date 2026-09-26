-- 0008 · a brand can revoke (or restore) the public link to a Receipt. The link is unlisted by an unguessable code (D-038).
create or replace function set_receipt_public(p_booking uuid, p_public boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform app._require_brand_of(p_booking);
  update bookings set receipt_public = coalesce(p_public, true) where id = p_booking;
end $$;
grant execute on function set_receipt_public(uuid, boolean) to byline_user;
