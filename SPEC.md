# SPEC — Byline (product + data + behaviour)

What gets built, precisely enough that a fresh session can implement any slice without asking. Status lives in [CLAUDE.md](CLAUDE.md);
decisions in [DECISIONS.md](DECISIONS.md); visual rules in [design/BRIEF.md](design/BRIEF.md). Vocabulary is fixed:
**Brief → Lineup → Wire → Receipt**, plus Tray, Escrow, Offer, Deal, Desk, Run-of-show.

> Sources: Naano's public pages (concept, pricing model, roles) and our own product design. The user's logged-in walkthrough
> (`recon/`) is used to **sanity-check flows and data only** — see the open questions in §12. Nothing visual or textual is copied.

> **Amendments made in Phase 3 (the build overrides the text below where they differ; see DECISIONS D-051 … D-061):**
> - The database is **portable Postgres** in `db/` (not Supabase). Accounts and sessions are app-owned (`accounts`, `sessions`); `profiles` does not exist. Supabase Realtime is replaced by polling (§7.5).
> - RLS is enforced per request with `SET LOCAL ROLE byline_user` + `app.user_id`; users read through definer views (`public_creators`, `my_offers`, `wire_events`, `booking_metrics`, `public_receipts`).
> - **Phase 7:** `/api/lineup` takes `budget` in whole euros (not cents); the landing live desk and `/developers` use the same shape code; a brief can travel in a URL (`lib/brief-params`).
> - **Phase 5–6:** creator RPCs `save_creator_profile` and `save_draft`; `set_receipt_public`; the Wire carries human clicks in 5-minute buckets (last 7 days); Receipts label the impressions source; `/go/[code]` is a route handler (302 first, click recorded after).
> - Extra RPCs: `create_account` and `link_lookup` / `record_click` (owner-only). `/go/[code]` uses `link_lookup` then `record_click`. `bookings` gains `auto_at`. `shortlist_requests` does not exist (D-037).
> **Amendments made in Phase 8 (D-092 … D-096):** sign-in returns you to the exact page you asked for (a proxy passes the requested URL to server components); the session cookie is `Secure` when the request came over HTTPS rather than by `NODE_ENV`; compact controls apply to fine pointers, not to a viewport width; the tray sheet pins the hold button; dialogs return focus; every page has a skip link.

---

## 1. People and jobs

| Role | Job to be done | Success looks like |
|---|---|---|
| **Brand** (marketing/founder) | Find creators whose audience is my buyers, know what €X will buy *before* I spend it, then see results as they happen | Books a lineup in minutes; sees clicks arrive live; keeps a shareable Receipt |
| **Creator** (B2B practitioner) | Get relevant paid offers at *my* price, deliver without admin, get paid, and show proof | Accepts an offer on a phone in seconds; gets paid on approval; media kit fills with verified Receipts |
| **Visitor** (unauthenticated, incl. the reviewer) | Understand the product and try it without signing up | Writes a brief on the landing page and sees a real lineup |

## 2. The golden path (demo + e2e test)

1. Visitor writes a brief sentence on `/` → live **lineup** from the DB (no sign-up).
2. "Book this lineup" → sign in as **demo brand** (one click) → the brief carries over to `/desk`.
3. Adds 3 creators → **Tray** shows total, projected clicks (low–high) and cost per click; wallet is sufficient.
4. **Hold to commit** → funds move wallet → escrow; 3 **Offers** go out.
5. Sandbox creators reply on their own (see §7.6); the **demo creator** (phone view) sees the Offer, **accepts**, **submits a draft**.
6. Brand **approves** the draft. Creator **marks live** with the post URL → the booking gets its **tracked link** `/go/[code]`.
7. Someone opens `/go/[code]` → the **Wire** ticks, clicks +1 live on the campaign page.
8. Brand **releases payout** → escrow → creator balance; booking is **paid**; the public **Receipt** `/receipt/[code]` is final.

Secondary paths (must work, less prominent): decline · request changes → resubmit · cancel with refund · creator reports stats ·
brand tops up wallet · creator edits media kit · public media kit visit · reset demo.

## 3. Screens

### Public
| Route | Purpose | Key behaviour |
|---|---|---|
| `/` | Landing + **live desk** | Brief sentence with slots → `GET /api/lineup` → roster of real creators with fit + why chips. One seeded real **Receipt** as proof. Pricing as a section (no plans; "no platform fee during beta"). Own copy. |
| `/join` | Sign-up | Own layout: pick a desk (brand / creator) → email + password → onboarding. |
| `/login` | Sign-in | Email/password + **"Enter as demo brand / demo creator"** buttons (credentials shown; demo data is shared and resettable). |
| `/c/[handle]` | Public **media kit** | Halftone portrait, headline, rate, audience mix, recent posts, **verified Receipts** list (from paid bookings), "Send an offer" CTA (→ sign-in). |
| `/receipt/[code]` | Public **Receipt** | See §7.4. Unlisted link, revocable by the brand. |
| `/go/[code]` | Tracked redirect | 302 to the campaign destination with UTM; click recorded after the response (§7.3). |
| `/developers` | API docs | `GET /api/lineup`, `GET /api/creators/[handle]`, `GET /api/health`. (Tier 2; cut first if tight.) |

### Brand (route group `(brand)`)
| Route | Purpose |
|---|---|
| `/desk` | **Brief sentence + Lineup + Tray.** Sentence slots: product (free text), buyers (multi-select role tags), vertical (multi), geography (multi), budget (€). Roster sorted by fit; each row: halftone, name, headline, fit bar + why chips, €/post, projected clicks, add/remove. Tray: selected creators, total, budget bar, projection range, cost per click, **hold to commit**. Below tray: campaign title, destination URL, key message, guidelines, publish-by date (collapsed "Brief details"). |
| `/campaigns` | List with status, spend, clicks, live/paid counts. Empty state invites "Write your first brief". |
| `/campaigns/[id]` | **Run-of-show** (timeline of bookings), bookings table, booking **drawer** (timeline of events/notes, draft review with approve / request changes, cancel, release payout, receipt link), live click counter + sparkline. |
| `/wire` | Full **Wire** feed with filters (campaign, kind). The **ticker** strip appears in the shell on every page. |
| `/wallet` | Balance, escrow, ledger table, "Add €… (test funds)". |

### Creator (route group `(creator)`, mobile-first)
| Route | Purpose |
|---|---|
| `/onboarding` | Handle, headline, verticals, country, followers (self-reported), **my rate per post**, audience mix (role/geo shares via simple pickers), destination for payouts (test mode: none). |
| `/offers` | Inbox of `invited` bookings: brand, campaign, brief excerpt, price, publish-by, **Accept / Decline** (thumb-zone). |
| `/deals` | Pipeline: Offer → Draft → Live → Paid, each card shows the single **next action**. |
| `/deals/[id]` | Deliver: brief + guidelines, draft editor (autosave), submit, feedback thread, mark live (post URL), report stats. |
| `/earnings` | Balance, paid deals list, ledger. |
| `/kit` | Edit media kit; preview `/c/[handle]`. |

Shell: brand and creator both get the **masthead + Wire ticker** (mobile: compact masthead + bottom tab bar) — see design brief.
In-app **notifications** (bell) replace email.

## 4. Booking state machine

```
invited ──accept──▶ accepted ──submit_draft──▶ drafted ──approve──▶ approved ──mark_live──▶ live ──release──▶ paid
   │                    │                        │  ▲                                          
   │decline             │cancel                  │  └── resubmit ── changes_requested ◀─request_changes
   ▼                    ▼                        ▼
declined            cancelled ◀─────── cancel (brand, any state before live)   [refund escrow]
```
- Legal transitions only; each transition is one RPC (§6) that also writes a `booking_events` row and a `notifications` row.
- `declined` and `cancelled` refund escrow in the same transaction. After `live`, cancelling is not allowed (use payout or dispute — dispute is out of scope).
- Only the **actor role** named in the RPC may perform it (`accept/decline/submit_draft/mark_live/report_stats` = creator; `place_hold/approve/request_changes/cancel/release_payout/top_up` = brand).

## 5. Data model (Postgres; money = integer cents, EUR)

```
profiles(id → auth.users, role check ('brand','creator'), display_name, is_demo bool, created_at)
brands(id, owner_id → profiles, company_name, website, wallet_cents int ≥ 0, created_at)
creators(id, user_id → profiles NULL for sandbox creators, handle unique, display_name, headline, bio, country,
         verticals text[], followers int, rate_cents int ≥ 2000, audience jsonb, halftone_seed text,
         imp_p25 int, imp_p50 int, imp_p75 int, ctr_p50 numeric, verified bool, is_sandbox bool, balance_cents int ≥ 0, created_at)
   audience = { roles: {cto:.., security:.., founder:.., revops:.., ...shares 0–1}, geo: {FR:.., DE:.., ...shares 0–1} }
creator_posts(id, creator_id, hook text, impressions int, clicks int, published_at)        -- history for kit + projection basis
campaigns(id, brand_id, title, sentence jsonb, objective, destination_url, key_messages, guidelines,
          budget_cents, publish_by date, status check ('draft','active','done'), created_at)
bookings(id, campaign_id, creator_id, price_cents int, status (enum §4), offer_note, draft_text, draft_version int,
         post_url, tracking_code unique (8-char base32), receipt_public bool default true, due_at,
         invited_at, responded_at, submitted_at, approved_at, live_at, paid_at, updated_at)
booking_events(id, booking_id, actor_id NULL, actor_role, kind, note, meta jsonb, at)      -- audit + note thread
tracking_events(id bigserial, booking_id, kind check ('click','lead'), at, ip_hash, ua_class check ('human','bot','preview'), country, referrer)
post_stats(booking_id pk, impressions, reactions, comments, source check ('self_reported','seeded'), reported_at)
ledger_entries(id, txn_id uuid, at, booking_id NULL, brand_id NULL, creator_id NULL,
               account check ('external','brand_wallet','escrow','creator_balance'), amount_cents int (signed),
               kind check ('topup','hold','release','refund'))
notifications(id, user_id, kind, booking_id, body, read_at, at)
```
**Views:** `wire` = `booking_events` ∪ `tracking_events` (human clicks) ∪ payout releases, `security_invoker`, so RLS scopes it to the viewer.
`booking_metrics` (per booking: clicks_total, clicks_unique, last_click_at, impressions, cost_per_click_cents).

**Ledger rules.** Every `txn_id` sums to zero. `topup`: external −X / brand_wallet +X. `hold`: brand_wallet −P / escrow +P.
`release`: escrow −P / creator_balance +P. `refund`: escrow −P / brand_wallet +P. `brands.wallet_cents` and `creators.balance_cents` are caches updated
in the same transaction; a SQL test asserts they equal the ledger sums. No withdrawals (Tier 3).

**Indexes:** `bookings(campaign_id)`, `bookings(creator_id,status)`, `tracking_events(booking_id,at)`, `booking_events(booking_id,at)`, `creators(handle)`, GIN on `creators.verticals`.

## 6. RPCs (all `SECURITY DEFINER`, fixed `search_path`, check `auth.uid()` and role; the client never writes these tables directly)

| RPC | Actor | Effect |
|---|---|---|
| `top_up_wallet(amount_cents)` | brand | Test funds; ledger `topup`. Max €50k per call. |
| `create_campaign(payload jsonb)` | brand | Inserts campaign (status `draft`). |
| `place_hold(campaign_id, items jsonb[{creator_id}])` | brand | **Price comes from `creators.rate_cents`, never the client.** Requires wallet ≥ total; creates `invited` bookings + tracking codes; ledger `hold`; campaign → `active`; events + notifications. Atomic. |
| `accept_offer(booking_id)` / `decline_offer(booking_id, reason)` | creator | invited → accepted / declined (+refund). |
| `submit_draft(booking_id, text)` | creator | accepted/changes_requested → drafted; `draft_version++`. |
| `request_changes(booking_id, note)` / `approve_draft(booking_id)` | brand | drafted → changes_requested / approved. |
| `mark_live(booking_id, post_url)` | creator | approved → live; validates URL; stores `live_at`. |
| `report_stats(booking_id, impressions, reactions, comments)` | creator | Upserts `post_stats` (self-reported). |
| `release_payout(booking_id)` | brand | live → paid; ledger `release`; creator balance; receipt final. |
| `cancel_booking(booking_id)` | brand | Any state before live → cancelled (+refund). |
| `sandbox_tick()` | any signed-in | Advances **sandbox-creator** bookings whose delay has elapsed (§7.6). Idempotent. |
| `reset_demo()` | demo users only | Restores the demo brand/creator to the seeded state. |
| `record_click(code, ip_hash, ua_class, country, referrer)` | **service role only** | Inserts a `tracking_events` click; returns destination URL. |

**RLS:** brands see only their `brands/campaigns/bookings/ledger/notifications`; creators see only their own `bookings/notifications/ledger`, and the campaign/brand columns
needed to read an offer (via a view); public reads `creators` (public columns), `creator_posts`, and receipt data by `tracking_code` where `receipt_public`.
`tracking_events`/`ledger_entries` are read-only to clients.

## 7. Behaviours

### 7.1 Fit score (TypeScript, `lib/fit.ts`, unit-tested)
Inputs: brief `{buyers[], verticals[], geo[], budget_cents}`; creator audience/verticals/`ctr_p50`.
- **Audience** (0.40): `min(1, Σ share of selected buyer tags ÷ 0.5)` — half your buyers in the audience = full marks.
- **Vertical** (0.25): `|creator.verticals ∩ selected| ÷ |selected|`.
- **Geography** (0.20): `min(1, Σ share of selected countries ÷ 0.5)`.
- **Performance** (0.15): `clamp((ctr ÷ vertical-median ctr − 0.5) ÷ 1.0, 0, 1)`.
- Empty facets score 1 (neutral). **Score = round(100 × Σ w·s).** Ties broken by `ctr_p50` then price.
- **Why chips:** the top 2–3 weighted contributions as text, e.g. "CTOs 61% of audience", "EU 74%", "CTR 1.4× vertical median". Always shown — fit is never a black box.
- Over-budget creators stay visible but dimmed with "€X over your budget"; they can still be added (the tray warns).

### 7.2 Projection (`lib/projection.ts`, unit-tested)
Per creator: `clicks_low = imp_p25 × ctr`, `clicks_mid = imp_p50 × ctr`, `clicks_high = imp_p75 × ctr`. Tray shows the summed **range** and `cost per click = total ÷ Σ mid`.
Copy states the basis: "estimated from each creator's last N posts; not a guarantee".

### 7.3 Tracked links
`/go/[code]` (Node route handler): look up booking → build destination = campaign `destination_url` + `utm_source=byline&utm_medium=creator&utm_campaign={campaign}&utm_content={handle}` →
**respond 302 immediately**, then record the click in `after()`. `ua_class`: `bot`/`preview` for known crawlers and link unfurlers (LinkedInBot, Slackbot, facebookexternalhit, Twitterbot, `bot|crawler|spider|headless`) — never counted.
`ip_hash = sha256(ip + ua + yyyy-mm-dd + secret)`; only the hash is stored. **Unique** = distinct `ip_hash` per booking per day. Country from `x-vercel-ip-country`.
Unknown code → friendly 404 page (not a stack trace).

### 7.4 Receipt (`/receipt/[code]`)
Printed-style page: booking number, creator (link to kit), brand, campaign, publish/live dates, post link, **tracked clicks (unique / total)**, impressions (**labelled self-reported**), fee, **cost per click**, ledger status (Paid / In escrow),
and a "How this is verified" note (clicks are counted by Byline's redirect; impressions are creator-reported). Shown for `live` and `paid`. Revocable via `receipt_public`.

### 7.5 The Wire
Kinds: `hold_placed, offer_sent, offer_accepted, offer_declined, draft_submitted, changes_requested, draft_approved, went_live, click, stats_reported, payout_released, cancelled`.
Ticker line: `14:02 · Maya Okafor accepted · Launch Q4`. Consecutive clicks on one booking collapse into "+3 clicks · Maya · 12 s ago".
Delivery: Supabase Realtime `postgres_changes` on `booking_events` and `tracking_events` (RLS-scoped); fallback poll every 5 s if the channel drops (pre-agreed simplification: → plain list).

### 7.6 Sandbox creators (so the brand's demo doesn't stall)
Seeded creators have no login. `creators.is_sandbox = true` ones **respond automatically**, driven lazily by `sandbox_tick()` (called on campaign/desk/wire load and every ~10 s while a campaign page is open; no cron):
`invited` → accepted after 8–20 s (≈80 %; ≈20 % decline) · `accepted` → drafted after 15–40 s · `changes_requested` → redrafted after 15 s · `approved` → live after 20 s with a plausible post URL and a few seeded impressions.
Delays are per-booking deterministic (hash of booking id). The UI labels these creators **"Sandbox creator — replies automatically"** everywhere they act. The demo creator is *not* sandbox: it acts only through the real creator UI.

### 7.7 Demo accounts
Two seeded auth users (`demo.brand@…`, `demo.creator@…`, shared password shown on `/login`). The demo brand has wallet funds and a running campaign in several states; the demo creator has one pending offer, one draft, one paid deal with a Receipt.
`reset_demo()` (footer link when signed in as a demo user) restores that state.

### 7.8 Hold to commit
Press-and-hold ≈ 900 ms fills the button and calls `place_hold`; releasing early cancels. **Keyboard/AT equivalent:** Enter/Space opens a confirm dialog with the same summary. `prefers-reduced-motion`: no fill animation, single confirm click.

## 8. Public API (Tier 2, used by the landing page)
- `GET /api/lineup?buyers=cto,security&verticals=fintech&geo=FR,DE&budget=600000&limit=12` → `{ creators:[{handle,name,headline,verticals,followers,rate_cents,fit,why[],projection:{low,mid,high},halftone_seed}], brief }`. Cached briefly; rate-limited per IP (best effort).
- `GET /api/creators/[handle]` → public kit JSON. `GET /api/health` → `{ok, db:true, counts:{creators,bookings,tracking_events}}`.
- No auth-required data is exposed. No PII beyond public kit fields.

## 9. Seed data (fictional, deterministic — `supabase/seed.sql` + `scripts/seed.ts` for auth users)
- **≈40 creators**: verticals across security, devtools, revops, sales-tech, hr-tech, fintech, martech, product, data/AI, legal-tech, vertical SaaS; followers 1.2k–180k; rates €40–€2,400 (correlated with reach × engagement); audience role/geo shares; `imp_p25/50/75`, `ctr_p50` 0.6–2.2 %; 8–12 `creator_posts` each over the last 90 days. Names, headlines and bios are invented; **no real people, companies or logos.**
- **3 brands** with invented company names; **1 running campaign** on the demo brand with ~5 bookings across states, one `paid` with ~600 seeded human clicks over ~10 days (so the Receipt and sparkline look real), one `live`, one `drafted`, one `accepted`, one `invited` (the demo creator's).
- Halftone seeds are the handles. Nothing depends on external images.

## 10. Non-functional
- **Performance:** landing LCP < 2.5 s on 4G; lineup response < 300 ms warm; redirect adds < 100 ms. Lighthouse ≥ 90 (perf, a11y, best practices) on `/`.
- **Security/privacy:** RLS everywhere; service-role key only in server routes; IPs hashed with a daily salt; no secrets in the repo; CSRF-safe server actions; rate limits on `/go`, `/api/lineup`.
- **Accessibility:** WCAG AA; keyboard-complete; visible focus; hold-to-commit has an accessible alternative; live regions for Wire updates (polite); reduced motion respected.
- **Reliability:** every async action has pending/success/error states; optimistic UI rolls back; error boundaries with a way back; empty states everywhere.
- **Observability:** `/api/health`; server logs on RPC failures; `capture-errors.log` for the agent hook.

## 11. Acceptance criteria by slice (each ends deployed)
- **Phase 3:** migrations apply from scratch; seed loads; RLS tests pass per role; ledger invariants pass; demo logins work on the deployed URL; `/api/health` shows real counts.
- **Slice A (Phase 4):** changing any slot re-ranks the lineup; fit ± why chips match `lib/fit` tests; adding creators updates total/projection; hold-to-commit moves money atomically (wallet↓ escrow↑, ledger nets 0) and creates `invited` bookings; insufficient funds is a designed error, not a crash.
- **Slice B (Phase 5):** creator onboarding creates a public kit; Offers inbox lists real invites; accept/decline/submit work on a 375 px viewport with thumb-reachable actions; draft autosaves.
- **Slice C (Phase 6):** approve → live → payout completes; `/go/[code]` counts human clicks only, bots excluded; the Wire and campaign counter update without reload; Receipt renders for `live`/`paid`; Run-of-show renders every state; sandbox creators progress on their own.
- **Phase 7:** the landing live desk works logged-out with real data; media kit shows verified Receipts.
- **Phase 8:** e2e golden path green **on the deployed URL**; 320–1920 widths clean; no console errors; a11y checks pass.

## 12. Open questions for the user's logged-in walkthrough (`recon/`)
Answers can change scope, so capture these while you're in the app (screenshots + a line each):
1. What fields does the **brand sign-up/onboarding** ask for, and what happens first after sign-up (empty dashboard? wallet? guided tour)?
2. How does a brand **pick a creator**: filters available, sort options, what a creator card/profile shows, how price is shown, any "shortlist"/"compare"?
3. **Campaign brief** fields (objective, messages, guidelines, links, dates, budget?) and what the "AI" step actually produces.
4. **Booking**: can the brand negotiate or set a price, or is it the creator's fixed rate? Is there a minimum spend? Does money move at booking (escrow/wallet top-up)?
5. Creator side: what an **offer** looks like, accept/decline options, what must be **delivered** (draft text? post URL? screenshot?), deadlines, edits/approval loop.
6. **Statuses** used anywhere (labels and order) and what triggers each.
7. **Tracking/results**: what metrics exist (clicks, leads, pipeline, impressions), how "leads/pipeline" get attributed, any per-creator breakdown.
8. **Payout**: when it happens, what the creator sees (balance, history, bank/Stripe setup).
9. Empty states, error states, notifications, and anything that annoyed or confused you (those are our opportunities).
Record answers in `recon/NOTES.md`. **Use them for flows and data only** — do not carry over visuals, copy or names (see the Never-touch list in CLAUDE.md).
