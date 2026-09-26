-- 0002 · schema. Money is integer cents (EUR). Timestamps are timestamptz.

create type booking_status as enum
  ('invited','accepted','declined','drafted','changes_requested','approved','live','paid','cancelled');

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text not null,
  role          text not null check (role in ('brand','creator')),
  display_name  text not null check (length(display_name) between 1 and 80),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index accounts_email_key on accounts (email);

create table sessions (
  id          text primary key,            -- sha256 of the cookie token; the token itself is never stored
  account_id  uuid not null references accounts on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index sessions_account_idx on sessions (account_id);

create table brands (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references accounts on delete cascade,
  company_name  text not null check (length(company_name) between 1 and 80),
  website       text,
  wallet_cents  integer not null default 0 check (wallet_cents >= 0),   -- cache of the ledger (see tests)
  created_at    timestamptz not null default now()
);

create table creators (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid unique references accounts on delete set null,   -- NULL for sandbox creators
  handle         text not null unique check (handle ~ '^[a-z0-9-]{3,40}$'),
  display_name   text not null,
  headline       text not null default '',
  bio            text not null default '',
  country        text,
  verticals      text[] not null default '{}',
  followers      integer not null default 0 check (followers >= 0),
  rate_cents     integer not null check (rate_cents >= 2000),
  audience       jsonb not null default '{}',   -- {"roles": {"CTOs": 0.61, ...}, "geo": {"France": 0.74, ...}} shares 0..1
  imp_p25        integer not null default 0,
  imp_p50        integer not null default 0,
  imp_p75        integer not null default 0,
  ctr_p50        numeric(5,2) not null default 0,   -- percent, e.g. 1.60
  verified       boolean not null default false,
  is_sandbox     boolean not null default false,
  balance_cents  integer not null default 0 check (balance_cents >= 0),   -- cache of the ledger
  created_at     timestamptz not null default now()
);
create index creators_verticals_idx on creators using gin (verticals);

create table creator_posts (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references creators on delete cascade,
  hook         text not null,
  impressions  integer not null,
  clicks       integer not null,
  published_at timestamptz not null
);
create index creator_posts_creator_idx on creator_posts (creator_id, published_at desc);

create table campaigns (
  id               uuid primary key default gen_random_uuid(),
  brand_id         uuid not null references brands on delete cascade,
  title            text not null check (length(title) between 3 and 80),
  sentence         jsonb not null default '{}',
  objective        text not null default 'demos' check (objective in ('demos','signups','awareness')),
  destination_url  text not null check (destination_url ~* '^https?://[^\s]+\.[^\s]+$'),
  key_messages     text not null default '',
  guidelines       text not null default '',
  budget_cents     integer not null default 0 check (budget_cents >= 0),
  publish_by       date,
  status           text not null default 'draft' check (status in ('draft','active','done')),
  created_at       timestamptz not null default now()
);
create index campaigns_brand_idx on campaigns (brand_id, created_at desc);

create table bookings (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns on delete cascade,
  creator_id     uuid not null references creators,
  price_cents    integer not null check (price_cents > 0),
  status         booking_status not null default 'invited',
  offer_note     text,
  draft_text     text,
  draft_version  integer not null default 0,
  post_url       text,
  tracking_code  text not null unique,
  receipt_public boolean not null default true,
  due_at         date,
  auto_at        timestamptz,                   -- sandbox creators only: when they next act
  invited_at     timestamptz not null default now(),
  responded_at   timestamptz,
  submitted_at   timestamptz,
  approved_at    timestamptz,
  live_at        timestamptz,
  paid_at        timestamptz,
  updated_at     timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
create index bookings_creator_idx on bookings (creator_id, status);
create index bookings_auto_idx on bookings (auto_at) where auto_at is not null;

create table booking_events (
  id          bigserial primary key,
  booking_id  uuid not null references bookings on delete cascade,
  actor_id    uuid,
  actor_role  text not null check (actor_role in ('brand','creator','system')),
  kind        text not null,
  note        text,
  meta        jsonb not null default '{}',
  at          timestamptz not null default now()
);
create index booking_events_booking_idx on booking_events (booking_id, at);

create table tracking_events (
  id          bigserial primary key,
  booking_id  uuid not null references bookings on delete cascade,
  kind        text not null default 'click' check (kind in ('click','lead')),
  at          timestamptz not null default now(),
  ip_hash     text not null,                    -- sha256(ip+ua+day+secret); the raw IP is never stored
  ua_class    text not null check (ua_class in ('human','bot','preview')),
  country     text,
  referrer    text
);
create index tracking_events_booking_idx on tracking_events (booking_id, at);

create table post_stats (
  booking_id   uuid primary key references bookings on delete cascade,
  impressions  integer not null check (impressions >= 0),
  reactions    integer not null default 0 check (reactions >= 0),
  comments     integer not null default 0 check (comments >= 0),
  source       text not null check (source in ('self_reported','seeded')),
  reported_at  timestamptz not null default now()
);

create table ledger_entries (
  id            bigserial primary key,
  txn_id        uuid not null,
  at            timestamptz not null default now(),
  booking_id    uuid references bookings on delete set null,
  brand_id      uuid references brands on delete set null,
  creator_id    uuid references creators on delete set null,
  account       text not null check (account in ('external','brand_wallet','escrow','creator_balance')),
  amount_cents  integer not null check (amount_cents <> 0),
  kind          text not null check (kind in ('topup','hold','release','refund'))
);
create index ledger_txn_idx on ledger_entries (txn_id);
create index ledger_brand_idx on ledger_entries (brand_id, at desc);
create index ledger_creator_idx on ledger_entries (creator_id, at desc);
create index ledger_booking_idx on ledger_entries (booking_id);

-- The core money invariant, enforced by the database itself: every transaction group nets to exactly zero.
-- Deferred, so a multi-row transaction can insert both legs before the check runs at COMMIT.
create or replace function app._ledger_balanced() returns trigger language plpgsql as $$
begin
  if (select coalesce(sum(amount_cents), 0) from ledger_entries where txn_id = new.txn_id) <> 0 then
    raise exception 'ledger_unbalanced' using detail = 'transaction ' || new.txn_id || ' does not net to zero', errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger ledger_balanced after insert on ledger_entries
  deferrable initially deferred for each row execute function app._ledger_balanced();

create table notifications (
  id          bigserial primary key,
  account_id  uuid not null references accounts on delete cascade,
  kind        text not null,
  booking_id  uuid references bookings on delete cascade,
  body        text not null,
  read_at     timestamptz,
  at          timestamptz not null default now()
);
create index notifications_account_idx on notifications (account_id, at desc);
