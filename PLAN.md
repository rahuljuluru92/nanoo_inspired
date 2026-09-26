# PLAN v2 — Byline: the wire desk for B2B creator campaigns

> Long-form appendix. **Live status, conventions and known cuts live in [CLAUDE.md](CLAUDE.md); decisions in [DECISIONS.md](DECISIONS.md).
> If this file conflicts with CLAUDE.md, CLAUDE.md wins.**

Inspired by Naano's *idea*. Built from a blank page: its own concept, layout, visual language, interaction model,
copy and data. Real backend end to end.

Scored on **speed** (working product, fast) · **product judgement** (what first, what cut) · **UX/UI** (good to use) ·
**how the agent was used** (the logs).

---

## 1. What I actually looked at (recon, honest version)

Viewed at desktop + 375 px mobile: home, `/creators`, `/register`, `/selection`, `/free-tools`, `llms.txt`.
**Not seen:** the logged-in app (needs an account; the user must do this walkthrough in Phase 1). Anything below about
their in-app UI comes only from their marketing preview.

| Area | What Naano does |
|---|---|
| Visual language | Pale-blue cloud-sky gradient, frosted-glass rounded cards, Inter-style bold tight type, black pill buttons, blue accents |
| Home structure | Sky hero → logo wall → big quote → product mock → 5-step strip → video testimonial/case study → 4 stat tiles → LinkedIn-post carousel → pricing → FAQ |
| Marketplace (preview) | Photo-card grid, "matching %" bar, followers / median views / post cost, left icon rail, floating "what can I help you find?" AI bar |
| Onboarding | Split screen: "I'm a creator / I'm a brand" left, solid-blue statement panel right |
| Model | Creator-set flat fee per post (from €20), brief builder, tracked links, wallet, payout ≈ 24 h, managed-service upsell, human-built free shortlist in 48 h |

## 2. Inspiration ledger — what we take, reinvent, and never touch

**Take (the idea only):** two-sided marketplace with creator/brand roles · flat creator-set price per post ·
fit-before-follower-count · tracked links for attribution · wallet + fast payout · brief → book → deliver → measure.

**Reinvent (our own answer to each):**

| Naano | Byline |
|---|---|
| Browse a grid, or ask an AI bar | **The brief is the search.** Write one sentence with editable slots; the lineup assembles live beneath it |
| 48-hour human-built shortlist | Instant lineup from the real DB, **before sign-up**, on the landing page itself |
| Photo cards | **Roster rows** with a generated halftone portrait, fit bar and "why" chips — no stock or real photos |
| Attribution dashboard tiles | **Receipt** per post: a printed-style proof of clicks, cost per click, dates — public, verifiable, shareable |
| Notifications | **The Wire**: a live newswire ticker of everything happening across your campaigns |
| Campaign list | **Run-of-show**: campaign as a calendar timeline, each booking a block that fills with clicks |
| "Confirm" button on payment | **Hold to commit**: press-and-hold moves money into escrow (with a keyboard/confirm equivalent) |
| Marketing claims, logo wall, video testimonial | Real live components on the page and one real seeded Receipt as the proof |

**Never copy:** their copy or phrases, logos, brand/customer names, testimonials, statistics, real creators' names/photos,
sky/cloud/glass look, blue split-screen register page, black-pill-on-Inter styling, photo-card grid, floating AI bar,
section order. All seed data is fictional. The **squint test**: a screenshot of Byline beside one of Naano must never be
mistaken for it — palette, type, layout, avatars and interaction model all differ.

## 3. Concept — four nouns

> **Brief → Lineup → Wire → Receipt.**  Brands write a **Brief**, assemble a **Lineup**, watch the **Wire** as things
> happen, and keep a **Receipt** as proof. Creators get **Offers**, file a **Draft**, go **Live**, get **Paid**, and
> build a media kit made of verified Receipts.

Every screen, label and empty state uses this vocabulary, so the product feels authored rather than assembled.

Two confidence moments drive the design: **see the outcome before committing budget** (projected clicks + escrow in the
tray) and **see the result the second it happens** (real tracked-link clicks move the dashboard live).

## 4. Scope tiers (binding)

**Tier 1 — the loop (all real, all in the DB)**
1. Auth, two roles, one-click demo logins (brand / creator).
2. Brief sentence → lineup with transparent fit score + reasons → tray with projection.
3. Booking state machine + escrow wallet ledger (hold to commit).
4. Creator: onboarding + media kit, offers inbox, accept/decline, submit draft, mark live with post URL, earnings.
5. Brand: review/approve/request changes → payout release.
6. Tracked links (`/go/[code]`) with real click events; Wire (realtime); Receipt page.

**Tier 2 — what makes it memorable**
7. Landing page with the **live desk** (anonymous brief → real lineup from the DB).
8. Halftone portrait generator, run-of-show calendar, public media kit `/c/[handle]`, hold-to-commit.
9. Small public read API (`/api/lineup`, `/api/creators/[handle]`) — the landing page uses it, so it is real and documented.

**Tier 3 — stretch:** AI parsing of a free-text brief (Anthropic key), OG images for kits/receipts, PWA install for creators,
dark mode, drag-to-reschedule, lead-event webhook.

**Cut, and say so:** real payments (top-up is a test button; the ledger is real) · LinkedIn API/scraping (creator stats seeded/self-reported) ·
agency workspaces · PDF contracts/invoices · email delivery · chat (per-booking note thread instead) · blog/SEO · French · admin panel.

## 5. Design system — "newsprint × trading desk"

Warm printed-page trust for the words; terminal precision for the numbers.

- **Palette:** paper `#F5F1EA` · ink `#15130F` · muted `#6B655B` · hairline `#E3DCCF` · **stop-press vermilion** `#FF4B1F`
  (actions, live) · **highlighter** `#FFD84D` (selection/emphasis only) · **money green** `#0E4B3A`. Colour is scarce, so it carries meaning.
- **Type:** display serif (Instrument Serif or Fraunces) for headlines and big numerals · grotesque (Geist / Inter Tight) for UI ·
  tabular mono for money, counts, datelines. Fluid `clamp()` scale, four sizes in-app.
- **Texture & marks:** hairline rules instead of card borders, faint paper grain, mono **datelines** ("BRIEF № 0042 · FILED 26 SEP"),
  perforated Receipt edges. Restraint: one grid, one radius set, no gradients, no glass, no shadows heavier than a hairline.
- **Halftone avatars:** procedural SVG dot-portraits seeded from a handle — unique per creator, on-theme, zero real faces.
- **Signature components:** `BriefSentence`, `RosterRow`, `FitBar` (+why chips), `Tray` (+`HoldButton`), `WireTicker`,
  `Receipt`, `RunOfShow`, `Halftone`, `Ticker`, `Stamp` (status), `Dateline`.
- **Motion:** 150–200 ms ease-out; count-ups, tray slide, sheet, roster re-sorts with FLIP; all off under `prefers-reduced-motion`.
- **Voice:** plain, editorial, confident; all copy original.

### Responsive strategy (designed, not squeezed)
| Surface | ≥1280 | 768–1279 | <768 (phone) |
|---|---|---|---|
| Brand desk | Brief bar · lineup · 360 px tray | Tray as slide-in drawer | Tray as **bottom sheet** with a peek bar ("3 · €4,200 · ~1.9k clicks"); rows become stacked cards via container queries |
| Navigation | Slim left rail + Wire ticker | Rail collapses to icons | Bottom tab bar, safe-area aware |
| Creator app | Two-pane inbox | Single pane + detail | **Mobile-first**: big Accept/Decline in thumb zone, autosaving draft form |
| Run-of-show | Full calendar | Week view | Agenda list |

Rules: mobile-first CSS · container queries for components · `dvh`/safe-area units · 44 px targets · no hover-only affordances ·
fluid type · tested at **320 / 375 / 768 / 1024 / 1280 / 1536 / 1920**, in the built-in browser **and real iOS Safari via the simulator**.

### "Not clumsy" bar
One spacing scale (4 px base) · skeletons not spinners · every list has an empty state · inline validation, disabled-while-pending buttons,
optimistic updates with rollback · no layout shift · visible focus rings · AA contrast · keyboard reachable · error boundaries with a way back ·
no console errors · Lighthouse ≥ 90 (perf/a11y) on landing. A `/styleguide` page is the source of truth; each screen is screenshotted at three
widths and critiqued against this list before it counts as done.

## 6. Screen map

| Public | Brand | Creator |
|---|---|---|
| Landing + live desk · Pricing · Creator media kit `/c/[handle]` · Receipt `/receipt/[code]` · Sign in / role-split sign-up (our own layout) · API docs | **Desk** (brief + lineup + tray) · Campaigns list · Campaign **Run-of-show** + bookings drawer · **Wire** · Wallet (ledger, test top-up) · Brief builder | **Offers** (inbox) · **Deals** pipeline (Offer → Draft → Live → Paid) · Deliver form · **Earnings** · Media kit editor |

## 7. Architecture

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript (strict) + Tailwind, shadcn/Radix primitives fully re-tokenised |
| Backend | **Supabase**: Postgres, Auth, RLS, Realtime, Storage. **Money and status changes only via Postgres RPCs** (atomic, unbypassable) |
| Routes | `/go/[code]` redirect + async click insert · `/api/lineup` · `/api/creators/[handle]` · `/api/health` (DB counts, proves it's live) |
| Deploy | Vercel + Supabase cloud · env vars for secrets · migrations + seed in repo (`supabase/`) |
| Tests | SQL tests (ledger nets to 0, legal transitions, RLS per role) · unit tests (fit score, projection) · **Playwright golden path** on the deployed URL |
| CI | GitHub Actions: typecheck, lint, unit, build |

**Data model**
```
profiles(id, role, name) · brands(id, owner_id, company, wallet_cents)
creators(id, user_id, handle, headline, bio, verticals[], followers, rate_cents, audience jsonb,
         imp_p25/p50/p75, ctr_p50, verified)         creator_posts(id, creator_id, hook, impressions, clicks, published_at)
campaigns(id, brand_id, title, sentence jsonb, objective, key_messages, guidelines, budget_cents, deadline, status)
bookings(id, campaign_id, creator_id, price_cents, status, draft_text, post_url, tracking_code, due_at, ...)
booking_events(id, booking_id, actor_id, kind, note, at)       tracking_events(id, booking_id, kind, at, ip_hash, ua_class, country)
post_stats(booking_id, impressions, reactions, comments)        ledger_entries(id, account, ref_booking, amount_cents, kind, at)
wire = VIEW over booking_events ∪ tracking_events              shortlist_requests(...)
```
**Fit score (transparent, unit-tested):** 40 % audience overlap · 25 % vertical · 20 % geography · 15 % performance vs vertical median;
each factor becomes a "why" chip. **Projection:** clicks = impressions(p25–p75) × ctr, summed over the tray.
**Invariants (each a test):** legal transitions only · hold ≤ wallet balance · atomic hold/release/refund · ledger nets to zero ·
brands see only their campaigns, creators only their bookings, public sees only kits and receipts.

## 8. Phases (each ends deployed, with an exit test)

| # | Phase | Box | Exit criteria |
|---|---|---|---|
| **0** | Capture + accounts | 30–45 min | Hooks verified in **two** desktop sessions; `CAPTURE-TEST.md` complete; first commit; GitHub repo, Supabase project, Vercel linked |
| **1** | Recon + spec + design brief | 60–75 min | User's logged-in walkthrough in `/recon` (**flows and data only, not visuals**); `SPEC.md`, `CLAUDE.md`, design brief with moodboard & the anti-list |
| **2** | Design system + shell | 90 min | Tokens, fonts, halftone generator, ~15 components, app shell (rail/tab bar, Wire ticker); `/styleguide` right at 4 widths |
| **3** | Data foundation | 90 min | Migrations, RLS, RPCs, rich seed (≈40 fictional creators, history, 3 brands, a running campaign); auth + roles + demo logins; **deployed, reading the real DB** |
| **4** | Slice A — Brief → Lineup → Book | 150 min | Brief sentence, live lineup + fit + why, tray + projection, hold-to-commit escrow; wallet changes in the DB |
| **5** | Slice B — Creator side | 120 min | Onboarding + media kit, offers inbox, accept/decline, draft, earnings; mobile-first pass |
| **6** | Slice C — Close the loop | 150 min | Approve → live → payout; `/go/[code]` tracking; Wire realtime; **Receipt** page; Run-of-show |
| **7** | Landing + public | 90 min | Landing with **live desk**, public media kit, pricing, API docs, own sign-up layout |
| **8** | Harden + polish | 90 min | Full responsive matrix + iOS Safari, a11y, empty/loading/error states, perf, e2e green on the live URL |
| **9** | Ship | 60–90 min | Incognito check, README (architecture + ERD + cut list), final logs commit, 5-min walkthrough, 1-min intro, submission |

≈ 14–16 h of work. **The working loop is live by about hour 8** (end of Phase 6); everything after is polish, cut in this order if needed:
1. AI parsing → 2. media-kit polish → 3. run-of-show → 4. API docs page → 5. realtime pulse (keep counts).
**Never cut:** Phases 4–6, the responsive pass, and the landing live desk.

**Golden path (demo + e2e):** anonymous visitor writes a brief on the landing page and sees a real lineup → signs in as demo brand → adds 3 creators →
tray shows projection → hold to commit (escrow) → creator (phone view) accepts, submits draft → brand approves → creator goes live with a URL →
payout releases → someone opens the tracked link → the Wire ticks and clicks +1 live → Receipt is shareable.

## 9. Best-of-the-best engineering signals (what reviewers open)

`CAPTURE-TEST.md` first · clean commit history with `.agent-logs/` interleaved · strict TypeScript with generated DB types ·
README with architecture diagram, ERD, and an explicit **cut list with reasons** · CI badge green · migrations + seed reproduce the DB ·
`/api/health` · SQL + unit + e2e tests · no secrets in the repo · zero console errors · consistent vocabulary in UI and code.

## 10. Working with the agent (scored too)

`CLAUDE.md` + `SPEC.md` first · vertical slices: plan → implement → verify in the browser → deploy · specific prompts, and correct the agent on the record
(dead ends stay in the log) · commit per slice with logs in the same commit · `/code-review` before ship · sub-agents only for independent chores (seed data, tests) ·
**never paste keys or passwords into chat — prompts are logged verbatim into a public repo.**

## 11. Risks

| Risk | Mitigation |
|---|---|
| Distinctive design turns clumsy | Tokens + components before screens; `/styleguide`; three-width critique per screen; restraint rules |
| Scope creep from cool ideas | Tiers are binding; new ideas go to Tier 3 |
| RLS/RPC bugs | SQL tests per role; money only through RPCs |
| Realtime/tracking flakiness | Redirect first, insert after response; fall back to polling; hashed IPs; bot filter |
| Empty demo looks dead | Rich seed with history and a running campaign; landing works with real data |
| Reviewer can't get in | Demo logins on landing; email confirmation off; `/api/health` |
| Looks derivative | Ledger §2 and squint test at Phase 2 and Phase 8 |
| Late deploy surprises | Deploy at end of Phase 3 and after every slice |

## 12. Submission checklist

- [ ] Live URL opens in a private window, not signed in; landing explains itself and the live desk works
- [ ] Demo logins work; golden path completes without errors, on desktop **and** phone width
- [ ] Public repo with `.agent-logs/` and `CAPTURE-TEST.md`; commits interleaved with logs; CI green
- [ ] README: what/why, stack, run locally, architecture + ERD, **what was cut and why**, how it differs from Naano
- [ ] **Walkthrough ≤ 5 min, camera on:** 0:00 who you are + the goal · 0:30 what Naano is and what I kept vs reinvented · 1:15 live golden path (desktop → phone) ·
      3:45 three design decisions (brief-is-search, Receipt, hold-to-commit) · 4:30 how I worked with the agent + what I cut/next
- [ ] **Intro video 1 min** (Loom or Drive, link sharing on): something not on your CV
- [ ] Links labelled: Live · Repo · Walkthrough · Intro

## 13. Defaults unless you object
Name **Byline** · light theme only (dark = Tier 3) · deterministic brief parsing first, AI later if a key is provided · test-mode wallet only.
