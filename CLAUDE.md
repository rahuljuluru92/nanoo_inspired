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
**Last updated:** 2026-09-26T06:25Z · **Current phase: 2 — Design system + shell: DONE** · next is Phase 3 (needs the Supabase project) · Clock started 2026-09-26T05:09Z

**Done**
- **Phase 0:** capture hook live (model id read from the transcript, D-026); repo `rahuljuluru92/nanoo_inspired` (public), first commit `55744cb` pushed.
- **Phase 1 (agent side):** [SPEC.md](SPEC.md), [design/BRIEF.md](design/BRIEF.md), [recon/README.md](recon/README.md); decisions D-027 … D-041.
- **Phase 2:** Next 16 + React 19 + Tailwind 4 scaffold; constrained theme + `tokens.css`; fonts; `Halftone` generator; 15 components (Button, Field, Chip, Stamp, Skeleton, EmptyState, Dateline, Modal/Sheet, Popover, Tabs, Toast, Table, CountUp, Sparkline, FitBar, RosterRow, BriefSentence, HoldButton, Tray, Ticker/WireItem, Receipt, RunOfShow, Masthead/BottomTabs/AppShell); `/styleguide` and a placeholder `/`; CI workflow. Decisions D-042 … D-050.
- **Verified (D-049):** typecheck, lint, 9 unit tests, production build; no horizontal overflow at 320–1920; axe 0 violations at 1280 and 375; hold-to-commit via real pointer events + keyboard; sheet focus; 44 px targets.

**In progress**
- **User:** logged-in Naano walkthrough → `recon/brand|creator/` + `recon/NOTES.md` (SPEC §12).
- Phase 0 tail: **canary 3** (fresh desktop session; first PROMPT must show `claude-sonnet-5`) → finalize `CAPTURE-TEST.md`.

**Next**
- **Phase 3 — data foundation:** write `supabase/migrations` (schema, RLS, RPCs), `seed.sql` + `scripts/seed.ts`, SQL tests (ledger nets to 0, legal transitions, RLS per role) — all writable offline now. Applying them, auth, demo logins and the **first deploy** need the Supabase project + Vercel (see blockers). Fold `recon/NOTES.md` into SPEC when it lands.

**Open blockers / awaiting the user**
1. **Supabase project + Vercel account** — now the critical path for Phase 3's deploy. Keys in `.env.local` only, **never in chat**. (Also: Docker/local Postgres could let SQL be tested without a cloud project — say if you prefer that.)
2. Naano logged-in walkthrough (agent cannot sign up).
3. Canary 3 (above).
4. Author handle: repo owner is `rahuljuluru92`, logs/commits use `rahuljuluru786` (D-008) — switch for future logs?
5. Confirm design direction + name "Byline"; AI brief parsing needs an Anthropic key (default: off). Defaults in force: Byline, deterministic parsing, light theme.
6. **Push policy:** two local commits (Phase 1, Phase 2) are not pushed — push at the end of every phase? Two sessions share the working tree; commit from one at a time (D-027).

---

## Concept## Concept## Concept — four nouns (use these words in UI **and** code)
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
money green `#0E4B3A`. **Instrument Serif** (display/numerals) · **Schibsted Grotesk** (UI) · **JetBrains Mono** tabular (money/metrics/datelines) (D-034). **Vermilion is fills-only with ink text on it; small vermilion text uses `#C2300A`; control borders `#8A8377`** (D-035, contrast measured).
Hairline rules, paper grain, mono datelines. **No gradients, glass, heavy shadows, blue.** Motion 150–200 ms, off under `prefers-reduced-motion`.
Shell = top **masthead + Wire ticker** (phone: compact masthead + bottom tab bar) — no left rail (D-033). Responsive: creator side mobile-first; brand side desktop-first with phone parity (tray→bottom sheet, rows→stacked cards via container queries).
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
- Pricing is a landing-page section, no plans (D-036) · `shortlist_requests` dropped (D-037) · no left rail (D-033) · no withdrawals, no dispute flow · creator stats self-reported/seeded and labelled (D-040) · sandbox creators reply automatically, clearly labelled (D-028).
- _Add new simplifications here as they happen, and log them in DECISIONS.md._
- Phase 2 simplifications: no tablet tray drawer (bottom sheet below 1024, D-045) · no stacked brief form (popover slots everywhere, D-046) · focus ring is a plain ink outline (D-048).
- **Where PLAN.md is outdated** (left rail, Geist/Inter Tight, free-shortlist form, pricing page): CLAUDE.md, SPEC.md and design/BRIEF.md win.

## Phases
| # | Phase | Box | Status |
|---|---|---|---|
| 0 | Capture + accounts | 30–45 min | **done** except canary 3 (live confirmation of the model-id fix); repo + first commit pushed; Supabase/Vercel pending |
| 1 | Recon + spec + design brief | 60–75 min | **agent side done** (SPEC, design brief, recon kit); user's logged-in walkthrough + `recon/NOTES.md` pending |
| 2 | Design system + shell (`/styleguide`) | 90 min | **done** (D-042 … D-050) |
| 3 | Data foundation (migrations, RLS, RPCs, seed, auth, demo logins, **deployed**) | 90 min | not started |
| 4 | Slice A — Brief → Lineup → Tray → hold-to-commit escrow | 150 min | not started |
| 5 | Slice B — Creator side (mobile-first) | 120 min | not started |
| 6 | Slice C — approve → live → payout; `/go/[code]`; Wire; Receipt; Run-of-show | 150 min | not started |
| 7 | Landing (live desk, pricing section) + public media kit + API | 90 min | not started |
| 8 | Harden + polish (responsive matrix, iOS Safari, a11y, e2e on live URL) | 90 min | not started |
| 9 | Ship (README, walkthrough, intro, submission) | 60–90 min | not started |

Golden path (demo + e2e): anonymous brief on landing → real lineup → demo brand adds 3 creators → tray projection → hold to commit → creator (phone) accepts + drafts →
brand approves → creator goes live with URL → payout releases → tracked link opened → Wire ticks, clicks +1 live → Receipt shareable.

---

## Conventions _(front end as built in Phase 2; database/API parts still planned)_
**Stack (built):** Next.js 16 App Router (Turbopack) + React 19 + TypeScript 5.9 strict (`noUncheckedIndexedAccess`) + Tailwind 4 with a **constrained theme** (no default colours/shadows/radii; only tokens exist) · Radix Dialog/Popover/Tabs only; own Button/Field/Toast/icons/charts · ESLint 9 · Vitest (`*.test.ts` beside the code) ·
Supabase (Postgres, Auth, RLS, Realtime, Storage) · Vercel · Playwright (e2e) · unit tests (pure logic: fit score, projection) · GitHub Actions CI (typecheck, lint, unit, build).

**Folder structure**
```
CLAUDE.md  DECISIONS.md  PLAN.md  SPEC.md  CAPTURE-TEST.md  README.md
design/BRIEF.md            visual + interaction rules (tokens, anti-list, components)
.claude/{settings.json, hooks/capture.py}     .agent-logs/   (never edit; never gitignore)
recon/                     screenshots + notes from the logged-in Naano walkthrough (flows/data only)
supabase/{migrations/, seed.sql, tests/}      SQL is the source of truth for the schema + RPCs
src/app/(public)/ (brand)/ (creator)/         route groups · api/ · go/[code] · receipt/[code] · c/[handle]
src/components/{ui,desk,wire,receipt,shell,art}/   built: primitives, desk (BriefSentence/RosterRow/Tray/HoldButton), wire, receipt (+RunOfShow), shell, art (Halftone/Wordmark)
src/lib/                                      built: cn, money, time, halftone, types, use-reduced-motion · planned: supabase/, fit.ts, projection.ts
src/app/styleguide/                           dev-only design-system page + fixtures (fictional data)
src/styles/tokens.css                         design tokens (the only place hex values live)
e2e/  .github/workflows/ci.yml
```

**Commands:** `npm run dev` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run build` (CI runs the last four).
**Local preview (D-050):** the `web` launch config does not start in this environment. Run `node node_modules/next/dist/bin/next dev --port 3100` in the background, then `preview_start web-attached`.
If `next dev` ever re-adds a boilerplate block to this file, `agentRules: false` in `next.config.ts` should prevent it (D-044).

**Naming**
- Files kebab-case; React components PascalCase exports; hooks `use-*.ts`; server actions in a co-located `actions.ts`.
- DB: snake_case, plural tables, **money as integer `*_cents`** (never floats, EUR), timestamps `*_at timestamptz`, lowercase enums,
  migrations `YYYYMMDDHHMMSS_description.sql`.
- RPCs are verb_noun: `place_hold`, `accept_offer`, `decline_offer`, `submit_draft`, `request_changes`, `approve_draft`, `mark_live`, `release_payout`, `top_up_wallet`.
- Booking states: `invited → accepted → drafted ⇄ changes_requested → approved → live → paid`; branches `declined`, `cancelled`.
- Vocabulary above is used verbatim in UI copy, route names, and identifiers.

**Rules of the road**
- State changes and money **only via RPCs**; RLS on every table; brands see only their campaigns, creators only their bookings, public sees only kits + receipts.
- No hard-coded hex or font names in components — tokens only (enforced by the constrained Tailwind theme, D-043). No shadows, no smooth gradients.
- Vermilion is a **fill** only, with ink text on it; small vermilion text uses `text-vermilion-ink`. Control borders are ink or `line-strong`, never vermilion or `line`.
- Times: use `LocalTime` (client-only); day labels via `formatDay` (UTC) — never format a timestamp on the server for display (D-047).
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
Reference: [SPEC.md](SPEC.md) (behaviour, data, RPCs, acceptance criteria) · [design/BRIEF.md](design/BRIEF.md) (visual rules) · [PLAN.md](PLAN.md) (risks, submission checklist + walkthrough script) · [CAPTURE-TEST.md](CAPTURE-TEST.md).
