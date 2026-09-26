# CLAUDE.md — Byline (read this first in every session)

Single source of truth for the plan and its **live status**. Long-form detail lives in [PLAN.md](PLAN.md); every real decision
is in [DECISIONS.md](DECISIONS.md) (append-only). **If PLAN.md conflicts with this file, this file wins.**

## What this is
An 8x Engineering assignment: rebuild the idea behind naano.com (B2B LinkedIn creator marketplace) as an original product,
**"Byline"** (working name), with a **real backend** (Postgres + API + auth, no mocks) and **our own frontend design**.
Deliverables: live deployed link · public repo with `.agent-logs/` committed · ≤5-min walkthrough (camera on) · 1-min intro video.
Scored on speed · product judgement (what built/cut) · UX/UI · how the agent is used (the logs).

---

## STATUS  _(update at the end of every phase/slice)_
**Last updated:** 2026-09-26T05:53Z · **Current phase: 0 — Capture + accounts (in progress)** · Clock started 2026-09-26T05:09Z

**Done**
- Capture hook built and verified live in the desktop session: prompt + final response land in `.agent-logs/` with the real model id (`.claude/hooks/capture.py`, `.claude/settings.json`).
- `git init`, `.gitignore` (does NOT ignore `.agent-logs/`), backfill of pre-hook turns, `CAPTURE-TEST.md` draft.
- Recon of Naano's **public** pages (desktop + mobile), `llms.txt`, register page. Plan v2 written; interactive concept mockup shown.
- `CLAUDE.md` + `DECISIONS.md` created (D-001 … D-024).
- **Canary 1 passed** (fresh desktop session `7cca7f4e`: prompt + response, no capture errors) and pasted raw into `CAPTURE-TEST.md`. Found `model: sonnet` on the first PROMPT of a fresh session → added a `SessionStart` hook to record the model (D-025).

- **Canary 2 ran** (session `7d8eec6d`): prompt captured, no capture errors, but it **disproved the D-025 fix**: the desktop `SessionStart` payload has no `model`, so the PROMPT logged `sonnet` again. Fixed in D-026 (read the model from the transcript's `model` attachment row); verified by replay only. `CAPTURE-TEST.md` updated honestly (canary 2 = model check failed, fixed afterwards).

**In progress**
- Phase 0 close-out: **canary 3** in a third fresh desktop session to confirm the D-026 fix live (first PROMPT must show `claude-sonnet-5`) → then first commit.

**Next**
- Phase 1: user's logged-in Naano walkthrough → `/recon`; write `SPEC.md`; design brief; scaffold repo. Then Phase 2 (design system + shell).

**Open blockers / awaiting the user**
1. **One more canary session** (`CAPTURE TEST 3 — 8x assignment, Rahul`, in a brand-new desktop session) — confirms the model fix live and finishes `CAPTURE-TEST.md`. **Nothing committed yet.**
2. GitHub: `gh` not installed and the GitHub MCP returned 401 → need a fixed connection or the user to create the public repo. Real GitHub handle also needed (log header uses `rahuljuluru786` as a fallback, D-008).
3. Accounts: Supabase project + Vercel (linked to GitHub). Keys go in `.env.local` only — **never in chat** (prompts are logged publicly).
4. Logged-in Naano walkthrough with screenshots (flows/data only, not visuals). Agent cannot sign up.
5. User's reaction to the design direction/mockup; confirm name "Byline"; say whether to enable AI brief parsing (needs an Anthropic key).

---

## Concept — four nouns (use these words in UI **and** code)
> **Brief → Lineup → Wire → Receipt.** Brands write a **Brief**, assemble a **Lineup**, watch the **Wire**, keep a **Receipt**.
> Creators get **Offers**, file a **Draft**, go **Live**, get **Paid**, and build a media kit of verified Receipts.

Other fixed terms: **Tray** (selected creators + projection + escrow), **Escrow**, **Deal** (creator's view of a booking), **Desk** (brand home),
**Run-of-show** (campaign calendar). Do not rename to cart/feed/dashboard/marketplace.

Confidence moments the product is built around: (1) **see the outcome before committing budget** (tray projection + escrow),
(2) **see the result the second it happens** (real tracked-link clicks move the Wire live).

## Inspiration ledger
**Take (idea only):** two-sided marketplace with creator/brand roles · flat creator-set price per post · fit-before-follower-count ·
tracked links for attribution · wallet + fast payout · brief → book → deliver → measure.

**Reinvent (ours):**
| Naano | Byline |
|---|---|
| Browse a grid or ask an AI bar | **The brief is the search** — sentence with editable slots, live lineup |
| 48-hour human shortlist | Instant real lineup **before sign-up** on the landing page |
| Photo-card grid | **Roster rows** + generated halftone portraits + fit bar with "why" chips |
| Stat-tile dashboard | **Receipt** per post: public, printed-style proof |
| Notifications | **The Wire** — live ticker of everything |
| Campaign list | **Run-of-show** calendar |
| "Confirm" payment button | **Hold to commit** into escrow (keyboard/confirm equivalent) |

**Never touch:** their copy/phrases, logos, customer names, testimonials, statistics, real creators' names/photos, sky/cloud/glass look,
blue split-screen sign-up, black-pill-on-Inter styling, photo-card grid, floating AI bar, section order. All seed data is fictional.
**Squint test:** Byline beside Naano must never be mistaken for it (run at Phase 2 and Phase 8).

## Design system (short form; full in PLAN.md §5)
Paper `#F5F1EA` · ink `#15130F` · muted `#6B655B` · hairline `#E3DCCF` · vermilion `#FF4B1F` (actions/live) · highlighter `#FFD84D` (selection/emphasis only) ·
money green `#0E4B3A`. Display serif (Instrument Serif/Fraunces) · grotesque (Geist/Inter Tight) · tabular mono for money/metrics/datelines.
Hairline rules, paper grain, mono datelines. **No gradients, glass, heavy shadows, blue.** Motion 150–200 ms, off under `prefers-reduced-motion`.
Responsive: creator side mobile-first; brand side desktop-first with phone parity (tray→bottom sheet, rail→bottom tabs, rows→stacked cards via container queries).
"Not clumsy" bar: skeletons not spinners, empty states everywhere, inline validation, no layout shift, focus rings, 44 px targets, AA contrast, 320–1920 tested.

## Scope
**Tier 1 (the loop):** auth + roles + demo logins · brief→lineup→tray · booking state machine + escrow ledger · creator flow (media kit, offers, draft, live, earnings) ·
approve→payout · tracked links `/go/[code]` + real click events · Wire · Receipt.
**Tier 2:** landing live desk (+ public `/api/lineup`) · halftone avatars · Run-of-show · public media kit `/c/[handle]` · hold-to-commit.
**Tier 3 (stretch):** AI brief parsing · OG images · PWA · dark mode · drag-to-reschedule · lead webhook.

### Known cuts / simplifications already decided (don't re-litigate; see DECISIONS.md)
- No real payments: test-mode wallet top-up; **ledger is real** (D-011).
- No LinkedIn API/scraping: creator stats are seeded / self-reported.
- Cut from Naano: managed tier, 48 h human shortlist form, free calculator tools, agency workspaces, blog/SEO, French, PDF contracts/invoices,
  email delivery (in-app only), chat (per-booking note thread instead), admin panel (seed + SQL) (D-022).
- Deterministic brief parsing first; AI parsing is Tier 3 (D-015). Light theme only (D-023).
- **Pre-agreed fallbacks if time/flakiness bites:** Wire realtime → polling → simple list · Run-of-show calendar → agenda list · dashboard charts → numbers only.
- Cut order if tight: AI parsing → media-kit polish → run-of-show → API docs page → realtime pulse. **Never cut** Phases 4–6, the responsive pass, the landing live desk.
- _Add new simplifications here as they happen, and log them in DECISIONS.md._

## Phases
| # | Phase | Box | Status |
|---|---|---|---|
| 0 | Capture + accounts | 30–45 min | **in progress** (hook works; canary 1 passed; canary 2 found + fixed the model-id defect; canary 3 + accounts + first commit pending) |
| 1 | Recon + spec + design brief | 60–75 min | not started |
| 2 | Design system + shell (`/styleguide`) | 90 min | not started |
| 3 | Data foundation (migrations, RLS, RPCs, seed, auth, demo logins, **deployed**) | 90 min | not started |
| 4 | Slice A — Brief → Lineup → Tray → hold-to-commit escrow | 150 min | not started |
| 5 | Slice B — Creator side (mobile-first) | 120 min | not started |
| 6 | Slice C — approve → live → payout; `/go/[code]`; Wire; Receipt; Run-of-show | 150 min | not started |
| 7 | Landing (live desk) + public media kit + pricing + API | 90 min | not started |
| 8 | Harden + polish (responsive matrix, iOS Safari, a11y, e2e on live URL) | 90 min | not started |
| 9 | Ship (README, walkthrough, intro, submission) | 60–90 min | not started |

Golden path (demo + e2e): anonymous brief on landing → real lineup → demo brand adds 3 creators → tray projection → hold to commit → creator (phone) accepts + drafts →
brand approves → creator goes live with URL → payout releases → tracked link opened → Wire ticks, clicks +1 live → Receipt shareable.

---

## Conventions _(planned — update to match reality when scaffolded in Phase 2/3)_
**Stack:** Next.js App Router + TypeScript (strict) + Tailwind (theme mapped to CSS-variable tokens) + shadcn/Radix primitives fully re-tokenised ·
Supabase (Postgres, Auth, RLS, Realtime, Storage) · Vercel · Playwright (e2e) · unit tests (pure logic: fit score, projection) · GitHub Actions CI (typecheck, lint, unit, build).

**Folder structure**
```
CLAUDE.md  DECISIONS.md  PLAN.md  CAPTURE-TEST.md  README.md
.claude/{settings.json, hooks/capture.py}     .agent-logs/   (never edit; never gitignore)
recon/                     screenshots + notes from the logged-in Naano walkthrough (flows/data only)
supabase/{migrations/, seed.sql, tests/}      SQL is the source of truth for the schema + RPCs
src/app/(public)/ (brand)/ (creator)/         route groups · api/ · go/[code] · receipt/[code] · c/[handle]
src/components/{ui,desk,wire,receipt,...}/    src/lib/{supabase,fit,projection,money,halftone,...}
src/styles/tokens.css                         design tokens (the only place hex values live)
e2e/  .github/workflows/ci.yml
```

**Naming**
- Files kebab-case; React components PascalCase exports; hooks `use-*.ts`; server actions in a co-located `actions.ts`.
- DB: snake_case, plural tables, **money as integer `*_cents`** (never floats, EUR), timestamps `*_at timestamptz`, lowercase enums,
  migrations `YYYYMMDDHHMMSS_description.sql`.
- RPCs are verb_noun: `place_hold`, `accept_offer`, `decline_offer`, `submit_draft`, `request_changes`, `approve_draft`, `mark_live`, `release_payout`, `top_up_wallet`.
- Booking states: `invited → accepted → drafted ⇄ changes_requested → approved → live → paid`; branches `declined`, `cancelled`.
- Vocabulary above is used verbatim in UI copy, route names, and identifiers.

**Rules of the road**
- State changes and money **only via RPCs**; RLS on every table; brands see only their campaigns, creators only their bookings, public sees only kits + receipts.
- No hard-coded hex or font names in components — tokens only. No shadows heavier than a hairline, no gradients.
- Every list has an empty state; every async action has pending + error states; optimistic updates roll back on failure.
- Commit per slice/phase, message `phaseN: subject` (or `sliceA: …`), **with `.agent-logs/`, CLAUDE.md and DECISIONS.md in the same commit**.
  Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Deploy to Vercel at the end of Phase 3 and after every slice.
- **Never edit or delete anything in `.agent-logs/`** (dead ends stay). **Never paste secrets into chat** — prompts are logged into a public repo. Secrets: `.env.local` only; `.env*` is gitignored.
- The agent does not create accounts (naano.com, GitHub, Supabase, Vercel); the user does.

## End-of-phase ritual
1. Update **STATUS**, the **Phases** table, and **Known cuts** in this file.  2. Append any new decisions/reversals to DECISIONS.md (never rewrite old ones).
3. Run the phase's exit test.  4. Commit code + logs + these two files together.  5. Deploy (from Phase 3 on).

## Resuming cold
Read this file → `tail` DECISIONS.md → `git log --oneline -10` → check `.agent-logs/capture-errors.log` exists/empty → continue from **Next** above.
Reference: [PLAN.md](PLAN.md) (design system detail, data model, risks, submission checklist + walkthrough script) · [CAPTURE-TEST.md](CAPTURE-TEST.md).
