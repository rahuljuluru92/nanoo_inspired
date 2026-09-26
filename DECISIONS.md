# DECISIONS — append-only

Every real decision, in the order it was made. **Never rewrite or delete an entry.** If a decision is later reversed,
append a new entry that says `Reverses D-0xx` and why; the history stays honest.

Entry format: `D-NNN · timestamp (UTC) · phase` → **Decision** · **Why** · **Rejected** · **Status**
Updated at the end of every phase/slice and committed with the code. Entries D-001–D-024 were back-filled at 2026-09-26T05:41Z
from the session timeline (timestamps are the turn in which the call was made, from `.agent-logs/`).

---

### D-001 · 2026-09-26T05:09Z · Phase 0
**Decision:** Work in Claude Code (desktop app), single model `claude-sonnet-5` for planning and execution.
**Why:** It is the tool at hand and has hook support, so capture can be automatic.
**Rejected:** Mixing tools or models mid-build (would fragment the log and the context).
**Status:** Active.

### D-002 · 2026-09-26T05:10Z · Phase 0
**Decision:** Stack = Next.js (App Router) + TypeScript + Tailwind on Vercel, with Supabase (Postgres, Auth, RLS, Realtime, Storage) as the backend.
**Why:** Fastest route to a genuinely real, connected backend (DB + API + auth) with no server to operate; one repo; public link in minutes.
**Rejected:** A separate API server (extra deploy surface, slower); SQLite/Turso (no auth/realtime for free, more code); mocked data (brief requires real backend).
**Status:** Active.

### D-003 · 2026-09-26T05:18Z · Phase 0
**Decision:** Capture via Claude Code hooks in project `.claude/settings.json`: `UserPromptSubmit` and `Stop` → `.claude/hooks/capture.py` (stdlib Python, always exits 0).
**Why:** Fires automatically (brief: "if you have to remember to run it, it is wrong"); project-scoped so it ships with the repo.
**Rejected:** Manual logging or end-of-session wrap-up (forgettable); a rules-file-only approach (not a hook, cannot capture).
**Status:** Active. Verified live in the desktop session (prompt + response entries with the real model id).

### D-004 · 2026-09-26T05:19Z · Phase 0
**Decision:** Prompt comes verbatim from the hook payload; response comes from `last_assistant_message`, falling back to the transcript (text after the turn's last tool call only). One file per session, header regenerated on every write; no sidecar state (counters derived from the log itself). Errors go to `.agent-logs/capture-errors.log`.
**Why:** Matches the brief ("prompt and final response, nothing in between"); a broken hook must be visible rather than silent.
**Rejected:** Logging only at `Stop` (prompt lost if a session dies mid-turn); a state file per session (extra artefact, can desync from the log).
**Status:** Active.

### D-005 · 2026-09-26T05:20Z · Phase 0
**Decision:** Backfill the first two turns (which ran before the hook existed) verbatim from the session transcript with `capture.py --backfill`, and flag it in the log front matter (`backfilled_turns: 1,2`) and in `CAPTURE-TEST.md`.
**Why:** The setup prompt is part of the record; a faithful, labelled copy is more honest than a gap or a hand-written entry.
**Rejected:** Leaving the turns unlogged; re-typing them by hand.
**Status:** Active.

### D-006 · 2026-09-26T05:21Z · Phase 0
**Decision:** Keep the failed headless canary session (`e5676082…`, standalone `claude -p` "Not logged in") in `.agent-logs/` unedited and document it in `CAPTURE-TEST.md` under "tried first".
**Why:** Brief says never edit or delete entries; dead ends are valuable. It also proved the hook loads in a fresh session.
**Rejected:** Deleting it to keep the logs tidy.
**Status:** Active.

### D-007 · 2026-09-26T05:21Z · Phase 0
**Decision:** Do not `git commit` until the two authenticated canaries pass and `CAPTURE-TEST.md` is complete; `.gitignore` never ignores `.agent-logs/`.
**Why:** No commit was requested yet, and the first commit should be a coherent, verifiable capture setup.
**Rejected:** Committing the half-verified setup early.
**Status:** Superseded in practice by the standing instruction (D-024) to commit at end of every phase; first commit still waits for the canaries.

### D-008 · 2026-09-26T05:21Z · Phase 0
**Decision:** Log author handle falls back to the email local-part (`rahuljuluru786`) until the real GitHub handle is supplied.
**Why:** The hook needs something deterministic; better than "unknown".
**Rejected:** Guessing a handle; hard-coding the display name.
**Status:** Open — replace when the user provides the handle.

### D-009 · 2026-09-26T05:26Z · Phase 0
**Decision:** I do not create accounts on naano.com or any service. The user does the logged-in walkthrough (screenshots into `/recon`) and creates GitHub / Supabase / Vercel accounts; secrets go only in `.env.local`, never in chat.
**Why:** Account creation is off-limits for the agent; and prompts are logged verbatim into a public repo, so pasted secrets would leak.
**Rejected:** Agent-created accounts; pasting keys into chat.
**Status:** Active. Logged-in Naano app still unseen.

### D-010 · 2026-09-26T05:26Z · Phase 0
**Decision:** Business logic for money and status changes lives in Postgres RPC functions; the client never writes balances or statuses directly. RLS on every table.
**Why:** Atomic, testable in SQL, cannot be bypassed from the browser — the "real backend" is demonstrably real.
**Rejected:** App-layer (route handler) logic with direct table writes.
**Status:** Active (design; no code yet).

### D-011 · 2026-09-26T05:26Z · Phase 0
**Decision:** Payments are test-mode: wallet top-up is a button, but the escrow/payout **ledger is real** (append-only, nets to zero). No Stripe.
**Why:** Real payments are a time sink with no scoring value; the ledger proves the money logic.
**Rejected:** Stripe test mode; a fake balance number with no ledger.
**Status:** Active.

### D-012 · 2026-09-26T05:36Z · Phase 0
**Decision:** Pivot the plan (v1 → v2) from a "same product, tidy UI" build to a distinct product concept, after the user said the work must be inspired-by, not a mock of, Naano and must be unique, responsive and creative.
**Why:** After actually viewing Naano's public pages (sky/cloud glass look, photo-card grid, floating AI bar, blue split-screen sign-up) the v1 plan was still too close in structure; originality is part of the brief.
**Rejected:** Keeping v1's card-grid marketplace and generic SaaS dashboard.
**Status:** Active. **Reverses** the generic-dashboard direction implied in the v1 plan (no separate entry existed for it).

### D-013 · 2026-09-26T05:36Z · Phase 0
**Decision:** Product name "Byline" (working) and a four-noun concept: **Brief → Lineup → Wire → Receipt**, used consistently in UI and code.
**Why:** A single authored vocabulary makes the product feel designed, and gives the walkthrough a spine.
**Rejected:** Reusing Naano terminology ("campaign brief", "marketplace", "dashboard") as the primary language.
**Status:** Active; name is a default awaiting the user's confirmation.

### D-014 · 2026-09-26T05:36Z · Phase 0
**Decision:** Inspiration ledger: **Take** only the idea (two roles, flat creator-set price per post, fit-before-followers, tracked links, wallet + fast payout). **Reinvent** every implementation. **Never copy** their copy, logos, customers, testimonials, stats, real creators, sky/glass look, blue split-screen sign-up, black-pill-on-Inter styling, photo-card grid, floating AI bar, section order. Squint test at Phase 2 and Phase 8.
**Why:** The user asked for inspiration, not mocking; also avoids IP/impersonation problems.
**Rejected:** Pixel-level cloning; light reskin of their layout.
**Status:** Active.

### D-015 · 2026-09-26T05:36Z · Phase 0
**Decision:** The brief is the search: a sentence with editable slots drives the lineup live (deterministic slot parsing first; AI free-text parsing is Tier 3).
**Why:** Distinct from Naano's browse-grid/AI-bar; faster to value; no LLM dependency for the core.
**Rejected:** A filter sidebar of dropdowns; an AI chat bar as the primary search.
**Status:** Active.

### D-016 · 2026-09-26T05:36Z · Phase 0
**Decision:** Landing page includes a **live desk**: an anonymous visitor writes a brief and sees a real lineup from the real DB before signing up (via a small public read API, `/api/lineup`, that the page itself uses).
**Why:** Shows a connected backend on first load; replaces Naano's 48-hour human-built shortlist form with an instant answer.
**Rejected:** A static hero with a marketing mock; an email-gated "we'll send you a shortlist" form.
**Status:** Active.

### D-017 · 2026-09-26T05:36Z · Phase 0
**Decision:** Visual identity "newsprint × trading desk": paper `#F5F1EA`, ink `#15130F`, muted `#6B655B`, hairline `#E3DCCF`, vermilion `#FF4B1F`, highlighter `#FFD84D`, money green `#0E4B3A`; display serif + grotesque + tabular mono; hairline rules; no gradients, glass or heavy shadows.
**Why:** Maximally different from a blue/cloud/glass/Inter look, and appropriate for "trust + numbers".
**Rejected:** Dark-mode-first; glassmorphism; gradient accents; the default shadcn look.
**Status:** Active. Awaiting the user's reaction to the mockup.

### D-018 · 2026-09-26T05:36Z · Phase 0
**Decision:** Creators get procedurally generated halftone dot-portraits (SVG from a handle hash). No photos, stock images or real people's faces.
**Why:** On-theme, unique per creator, zero IP or impersonation risk, no asset pipeline.
**Rejected:** Stock/AI photos; initials-only circles; scraping real avatars.
**Status:** Active.

### D-019 · 2026-09-26T05:36Z · Phase 0
**Decision:** Signature interactions: roster rows (not cards), Campaign Tray with projected clicks + escrow, hold-to-commit (with keyboard/confirm equivalent), the Wire (realtime feed), Receipt (public proof page), Run-of-show calendar.
**Why:** Each maps to a confidence moment — see the outcome before spending; see the result the second it happens; keep proof.
**Rejected:** A conventional analytics dashboard of stat tiles as the main results surface.
**Status:** Active. Pre-agreed fallbacks: Wire may become a simple list; Run-of-show may become an agenda list (see CLAUDE.md cuts).

### D-020 · 2026-09-26T05:36Z · Phase 0
**Decision:** Responsive strategy: creator side is mobile-first; brand side is desktop-first with full phone parity (tray → bottom sheet, rail → bottom tab bar, rows → stacked cards via container queries); verified at 320/375/768/1024/1280/1536/1920 and real iOS Safari via the simulator.
**Why:** Creators will accept offers on phones; brands plan on desktop but must not be locked out on mobile.
**Rejected:** Desktop-only with a squeezed mobile fallback.
**Status:** Active.

### D-021 · 2026-09-26T05:36Z · Phase 0
**Decision:** Scope tiers. Tier 1 = the loop (auth + roles + demo logins, brief→lineup→tray, booking state machine + escrow ledger, creator flow, approve/payout, tracked links, Wire, Receipt). Tier 2 = landing live desk, halftone, Run-of-show, public media kit, public read API. Tier 3 = AI parsing, OG images, PWA, dark mode, drag-to-reschedule, lead webhook. Cut order if tight: AI parsing → media-kit polish → run-of-show → API docs page → realtime pulse. Never cut Phases 4–6, the responsive pass, or the landing live desk.
**Why:** Speed and product judgement are scored; the loop must exist before decoration.
**Rejected:** Building breadth (blog, agency workspaces, PDF invoices, i18n) or polishing before the loop works.
**Status:** Active.

### D-022 · 2026-09-26T05:36Z · Phase 0
**Decision:** Cut from Naano's surface: the managed-service tier, the human-built 48-hour shortlist form (superseded by the instant lineup), the free calculator tools (worth / engagement / delivery odds / budget planner — the tray projection covers budget planning), agency workspaces, blog/SEO, French, contracts/PDF invoices, email delivery (in-app notifications), chat (per-booking note thread), admin panel.
**Why:** None is on the critical path to the golden path; each would dilute the demo.
**Rejected:** Building a "lite" version of each for completeness.
**Status:** Active. The `shortlist_requests` table is optional and not in Tier 1–2.

### D-023 · 2026-09-26T05:36Z · Phase 0
**Decision:** Light theme only; deterministic brief parsing first; test-mode wallet only; Byline as the working name — these are defaults unless the user objects.
**Why:** Removes decisions that would otherwise block Phase 1.
**Rejected:** Asking the user to pre-decide each.
**Status:** Active (name and AI-key question still unanswered by the user).

### D-024 · 2026-09-26T05:41Z · Phase 0
**Decision:** Create `CLAUDE.md` (live status + plan-of-record + conventions, auto-loaded by every new session) and this append-only `DECISIONS.md`; update both at the end of every phase/slice and commit them with the code. `PLAN.md` stays as the long-form appendix; **if it conflicts with CLAUDE.md, CLAUDE.md wins.**
**Why:** User instruction: any fresh session must be able to pick up cold, and history must stay honest. Keeping CLAUDE.md lean keeps it cheap to load every session.
**Rejected:** Merging PLAN.md into CLAUDE.md (too long to load each session); letting the plan and status live only in chat or in memory.
**Status:** Active.

### D-025 · 2026-09-26T05:47Z · Phase 0
**Decision:** Add a `SessionStart` hook to `capture.py` that records the session's reported model to `~/.cache/8x-capture/<session>.json` (outside the repo); the prompt handler resolves the model as payload → last assistant message in the transcript → SessionStart → settings alias → `unknown`. The already-logged canary-1 PROMPT entry (`model: sonnet`) is left unedited.
**Why:** Canary 1 showed the first PROMPT of a fresh session logging the alias `sonnet` instead of the real model id, and the brief wants the model visible on every entry so a mid-build switch shows. The prompt payload carries no model, so it has to be captured earlier.
**Rejected:** Patching the PROMPT's model line when the response arrives (edits a logged entry after the fact, against the append-only spirit); leaving the alias (misleading to reviewers); a sidecar inside `.agent-logs/` (clutters the committed record).
**Status:** Active, pending confirmation in canary 2 that the desktop app includes `model` in the SessionStart payload. Known limit: after a mid-session model switch the prompt line can lag one turn; the RESPONSE line is authoritative.


### D-026 · 2026-09-26T05:52Z · Phase 0
**Decision:** Read the model for a PROMPT entry from the session transcript, not from `SessionStart`. `capture.py` now takes the newest of (a) an assistant message's `model` or (b) the `{"type":"attachment","attachment":{"type":"model","identity":{"modelId":…}}}` row the desktop app writes with a session's first user message; the prompt handler retries up to 4 × 0.25 s if the transcript lags. Resolution order: payload → transcript → SessionStart cache → settings alias → `unknown`. The `SessionStart` hook stays, harmlessly, for clients that do send a model. Supersedes the mechanism (not the goal) of D-025.
**Why:** Canary 2 (fresh desktop session `7d8eec6d`) showed the desktop `SessionStart` payload has no `model` field (keys: `cwd, hook_event_name, scratchpad_dir, session_id, source, transcript_path`), so D-025 could not work and the PROMPT logged the alias `sonnet` again. The real id (`claude-sonnet-5`) is already in the transcript's model attachment row.
**Rejected:** Patching the logged PROMPT afterwards (edits history); parsing the alias from `~/.claude/settings.json` (it is an alias, not the real id); removing the `SessionStart` hook (costs nothing and covers other clients).
**Status:** Active. Verified by replay only (first-prompt rows → `claude-sonnet-5`; full transcript → same; empty → `unknown`, exit 0). Live confirmation = canary 3. Canary-1 and canary-2 PROMPT entries stay as logged (`model: sonnet`).

### D-027 · 2026-09-26T05:54Z · Phase 1
**Decision:** Repo is public GitHub `rahuljuluru92/nanoo_inspired` (remote `origin`); first commit `55744cb` was made and pushed from a parallel session at the user's request.
**Why:** Required deliverable; commits with logs interleaved show the real build order.
**Rejected:** Private repo; waiting for canary 3 before the first push.
**Status:** Active. Two sessions (`4d4e227d`, `7d8eec6d`) now write the same working tree: `.agent-logs/` files show as modified continuously, and only one session should commit at a time. Open: whether to push at every phase end (asked).

### D-028 · 2026-09-26T06:00Z · Phase 1
**Decision:** **Sandbox creators**: seeded creators have no login and reply automatically, driven lazily by an idempotent `sandbox_tick()` RPC (called on campaign/desk/wire load and every ~10 s while a campaign page is open). The UI labels them "Sandbox creator — replies automatically". The demo creator is not sandbox.
**Why:** Without them the brand's golden path stalls (nobody accepts the offers); the reviewer must be able to complete the loop alone, and the labelling keeps it honest.
**Rejected:** Cron/pg_cron (extra infra, fragile on free tier); leaving bookings pending; pre-seeding every booking as already accepted (no live feel).
**Status:** Active (SPEC §7.6).

### D-029 · 2026-09-26T06:00Z · Phase 1
**Decision:** Two **shared demo accounts** (brand, creator) with credentials shown on `/login`, plus a `reset_demo()` RPC restoring seeded state.
**Why:** One-click entry for reviewers who are not signed in; shared state is cheap and resettable.
**Rejected:** Per-visitor anonymous sandboxes (isolation but much more seeding/RLS complexity); asking reviewers to sign up.
**Status:** Active. Risk: concurrent reviewers mutate shared demo data — mitigated by reset.

### D-030 · 2026-09-26T06:00Z · Phase 1
**Decision:** **Fit score and projection are computed in TypeScript** (`lib/fit.ts`, `lib/projection.ts`) over creator rows, not in SQL. Weights: audience 0.40, vertical 0.25, geography 0.20, performance 0.15; every score carries "why" chips.
**Why:** Pure functions are trivially unit-tested and quick to iterate; ~40–100 creators makes in-app scoring instant; the same code serves the landing API and the Desk.
**Rejected:** A SQL scoring function (harder to test/iterate, hides logic from reviewers); ML/embedding matching (opaque, slower, out of scope).
**Status:** Active.

### D-031 · 2026-09-26T06:00Z · Phase 1
**Decision:** **Ledger is the source of truth**: append-only `ledger_entries` grouped by `txn_id` (each nets to zero) over accounts `external, brand_wallet, escrow, creator_balance`; `brands.wallet_cents` / `creators.balance_cents` are caches updated in the same RPC transaction, with a SQL test that they equal the ledger sums.
**Why:** Fast reads without recomputation, yet drift is detectable; double-entry makes the money logic reviewable.
**Rejected:** Balance columns only (can silently drift); computing every balance from the ledger on read (slow, complex RLS).
**Status:** Active. No withdrawals (Tier 3).

### D-032 · 2026-09-26T06:00Z · Phase 1
**Decision:** Payout is **released by the brand** (`release_payout`) after the post is live; no automatic time-based release for now.
**Why:** Mirrors the reference product's "review then pay" while keeping a human check before money leaves escrow; simple to test and demo.
**Rejected:** Auto-pay on `mark_live` (no verification); a 48 h auto-release timer (needs scheduling; add later if time allows).
**Status:** Active. Reverse/extend if the walkthrough shows a different trigger.

### D-033 · 2026-09-26T06:01Z · Phase 1
**Decision:** App shell is a **top masthead with a Wire ticker strip** (phone: compact masthead + bottom tab bar), **not a left icon rail**. Wordmark = italic serif "Byline" with a 2 px vermilion rule.
**Why:** The reference app uses a left icon rail; a newspaper-style masthead is more distinct and carries the editorial concept and the live Wire.
**Rejected:** A slim left rail (planned in PLAN.md §5/§6 and D-020's responsive table).
**Status:** Active. **Reverses** the "rail" part of D-020 / PLAN.md §5; the rest of D-020 stands.

### D-034 · 2026-09-26T06:01Z · Phase 1
**Decision:** Fonts: **Instrument Serif** (display/numerals), **Schibsted Grotesk** (UI), **JetBrains Mono** (data/money/datelines), self-hosted via `next/font`.
**Why:** Schibsted Grotesk is news-origin and clearly not Inter-like; the trio supports newsprint × trading desk.
**Rejected:** Inter / Inter Tight / Geist (too close to the reference's Inter-like look; the concept mockup used Inter Tight only as a stand-in).
**Status:** Active. Supersedes the "Geist / Inter Tight" options listed in PLAN.md §5.

### D-035 · 2026-09-26T06:01Z · Phase 1
**Decision:** **Vermilion `#FF4B1F` is for fills only, with ink text on it** (5.6:1). Small vermilion text/links use `--vermilion-ink #C2300A` (5.0:1). Control borders use `--line-strong #8A8377` (3.3:1); `--line` is decoration only. Contrast was measured, not assumed.
**Why:** Vermilion text on paper is 2.97:1 and white on vermilion is 3.34:1 — both fail AA; the concept mockup's white-on-vermilion hold button was wrong.
**Rejected:** White text on vermilion; vermilion body text; lightening the accent (loses the punch).
**Status:** Active (design/BRIEF.md §3).

### D-036 · 2026-09-26T06:01Z · Phase 1
**Decision:** **Pricing is a section of the landing page**, not a separate page and not tiered: "no platform fee during beta; you pay each creator's flat fee per post". The managed-service tier stays cut (D-022).
**Why:** We have no real billing; a plans page would be theatre. Keeps the landing page focused on the live desk.
**Rejected:** A full `/pricing` page with Self-Serve/Managed plans mirroring the reference.
**Status:** Active.

### D-037 · 2026-09-26T06:01Z · Phase 1
**Decision:** **Drop the `shortlist_requests` table** and any free-shortlist form.
**Why:** Superseded by the instant lineup (D-016); no user story needs it.
**Rejected:** Keeping it "just in case".
**Status:** Active. Refines D-022 (which had left it optional).

### D-038 · 2026-09-26T06:02Z · Phase 1
**Decision:** **Receipts are public but unlisted** (unguessable 8-char tracking code) and **revocable** per booking via `receipt_public`; creators' media kits list their paid Receipts.
**Why:** Shareable proof is the point; revocability protects brands; no enumeration surface.
**Rejected:** Login-gated receipts (kills the trust/shareability story); fully listed public receipts (privacy).
**Status:** Active (SPEC §7.4).

### D-039 · 2026-09-26T06:02Z · Phase 1
**Decision:** **Click tracking**: `/go/[code]` answers 302 immediately, records the click in `after()`; bots/link-unfurlers are classified and never counted; `ip_hash = sha256(ip+ua+date+secret)` (only the hash is stored); unique = distinct hash per booking per day; country from `x-vercel-ip-country`.
**Why:** Real, defensible click counts without slowing the redirect or storing raw IPs.
**Rejected:** Insert-then-redirect (slower); counting all hits (inflated by previews); storing raw IPs (privacy).
**Status:** Active (SPEC §7.3).

### D-040 · 2026-09-26T06:02Z · Phase 1
**Decision:** Creator stats (followers, audience mix, impressions) are **self-reported or seeded and labelled as such** everywhere; no LinkedIn API or scraping. Clicks are the only *verified* metric.
**Why:** Honest about what the platform can vouch for; keeps scope inside a day; the Receipt states exactly what is verified.
**Rejected:** Faking "verified" data; scraping LinkedIn (ToS, fragile).
**Status:** Active.

### D-041 · 2026-09-26T06:03Z · Phase 1
**Decision:** The logged-in Naano walkthrough is used **for flows and data only**; screenshots go to `recon/`, must be cropped/blurred of personal data and secrets (the folder is committed publicly), and answers are recorded in `recon/NOTES.md` against SPEC §12.
**Why:** Keeps recon useful without leaking into visuals/copy (Never-touch list) or exposing private data.
**Rejected:** Copying their screens as a design reference; committing raw screenshots.
**Status:** Active. Walkthrough in progress by the user.

### D-042 · 2026-09-26T06:25Z · Phase 2
**Decision:** Toolchain: Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 + **TypeScript 5.9 (pinned)** + **ESLint 9** flat config + Vitest. Only Radix Dialog, Popover and Tabs are dependencies; Button, Field, Toast, icons, charts and the halftone generator are our own.
**Why:** Newest majors of TypeScript (7, native port) and ESLint (10) were resolved by npm but are not supported by Next's tooling yet; fewer dependencies keeps the look entirely ours and the bundle small.
**Rejected:** shadcn/ui generator (default look, fights the anti-list); lucide-react (generic icon style); Recharts (bloat for two charts); TS 7 / ESLint 10.
**Status:** Active. Amends D-002's stack line.

### D-043 · 2026-09-26T06:25Z · Phase 2
**Decision:** Tailwind theme is **constrained to our system**: default colours, radii, shadows and blur are reset, so only our tokens exist (`bg-paper`, `text-ink`, `border-line`…); `tokens.css` is the only place hex values and font stacks live (documented exceptions: `icon.svg` and the `themeColor` meta tag).
**Why:** Makes off-system choices (a stray blue, a shadow) impossible by construction rather than by discipline — the anti-list becomes a build-time constraint.
**Rejected:** Keeping the default palette and relying on review.
**Status:** Active.

### D-044 · 2026-09-26T06:25Z · Phase 2
**Decision:** Set `agentRules: false` in `next.config.ts` and remove the block `next dev` appended to `CLAUDE.md`.
**Why:** `next dev` (16.3) auto-generates its own boilerplate section inside CLAUDE.md on every run; that file is this project's source of truth and is committed, so tooling must not edit it. The option was verified to exist in the installed Next types before use.
**Rejected:** Leaving the block in and committing it; deleting the block after every run.
**Status:** Active. Nothing in that generated block was treated as project guidance.

### D-045 · 2026-09-26T06:25Z · Phase 2
**Decision:** Tray below 1024 px is a **sticky peek bar + bottom sheet**; there is no separate 768–1023 right-hand drawer. The peek bar is `sticky` (rides the viewport bottom only while the Desk is on screen), not `fixed`.
**Why:** One mobile pattern to build and test; the fixed version hovered over unrelated content and left a gap at tablet widths where there is no tab bar.
**Rejected:** A fixed peek bar; a dedicated tablet drawer.
**Status:** Active. **Reverses** the "768–1023: slide-in drawer" row in design/BRIEF.md §5–§6.

### D-046 · 2026-09-26T06:25Z · Phase 2
**Decision:** `BriefSentence` uses popover slots at **every** width; the stacked-form fallback is dropped.
**Why:** Tested at 320 and 375 px: the sentence wraps cleanly, slots are ≥44 px on touch, popovers are `min(92vw, 22rem)`. A second form would duplicate logic and IDs.
**Rejected:** A separate stacked form under 768 px.
**Status:** Active. **Reverses** the fallback line for `BriefSentence` in design/BRIEF.md §5.

### D-047 · 2026-09-26T06:25Z · Phase 2
**Decision:** Times are rendered **client-side only** (`LocalTime`, in the viewer's timezone, empty until mounted) and day labels are formatted in **UTC**.
**Why:** Server and browser timezones differ, which produces hydration mismatches; `suppressHydrationWarning` would leave the server's wrong time on screen.
**Rejected:** `suppressHydrationWarning`; formatting on the server.
**Status:** Active.

### D-048 · 2026-09-26T06:25Z · Phase 2
**Decision:** Accessibility implementation choices: focus ring = 2 px ink outline, 2 px offset (the vermilion inner ring in BRIEF §3 is dropped); HoldButton border is **ink** (a vermilion border is 2.97:1); over-budget roster rows keep full contrast and say "€X over" instead of being dimmed; sheets focus themselves on open rather than the first control (which can be a destructive Remove); per-instance IDs via `useId`; the tray is a `section`, not an `aside`.
**Why:** Each was found by measurement or an axe finding, not taste: dimming and vermilion borders fail contrast; auto-focusing Remove invites accidental deletion; duplicate IDs and a nested landmark are axe violations.
**Rejected:** Dimmed rows; vermilion borders; Radix default autofocus.
**Status:** Active. Simplifies design/BRIEF.md §3 and §5 where they differ.

### D-049 · 2026-09-26T06:25Z · Phase 2
**Decision:** Verification is measured, and becomes e2e assertions in Phase 8: horizontal overflow checked by script at 320/375/768/1024/1280/1536/1920 (all clean); axe-core 4.10.2 (WCAG 2.0/2.1/2.2 A+AA + best-practice) run at 1280 and 375 (0 violations; 1 "incomplete" contrast check on a textarea partly covered by the sticky masthead, colours known good); touch targets audited (≥44 px except deliberate 36 px `sm` buttons in dense rows).
**Why:** "Not clumsy" is a claim that needs numbers; scripts are repeatable in CI later.
**Rejected:** Eyeballing screenshots only.
**Status:** Active.

### D-050 · 2026-09-26T06:25Z · Phase 2
**Decision:** Local preview: the `web` launch config (`npm run dev`) starts nothing in this environment (no PATH), so run `node node_modules/next/dist/bin/next dev --port 3100` in the background and open it with the `web-attached` preview config.
**Why:** Found by trial; recorded so no future session loses time.
**Rejected:** Trying to fix the sandbox PATH.
**Status:** Active.

### D-051 · 2026-09-26T06:48Z · Phase 3
**Decision:** **The backend is portable Postgres, not Supabase-specific.** The app connects with `DATABASE_URL` to any Postgres 15+; local development uses a project-local cluster on :54322 (`scripts/db-local.sh`). Supabase Auth, PostgREST, Realtime and Storage are not used; Supabase (or Neon) remains a valid place to *host* the database.
**Why:** No Supabase project exists yet, Docker is not running and only ~11 GB of disk is free (the Supabase local stack needs several GB of images). A portable design builds and tests the real backend now, and switching to a hosted database is a connection-string change, so nothing is throwaway.
**Rejected:** Waiting for a cloud project; Docker + `supabase start` (heavy, risky on this disk); a mocked data layer (the brief requires a real backend).
**Status:** Active. **Reverses** the Supabase Auth/Realtime/Storage part of D-002 and the "Supabase" stack line in CLAUDE.md. The Phase 3 *deploy* exit test is pending a hosted Postgres from the user.

### D-052 · 2026-09-26T06:48Z · Phase 3
**Decision:** **Row-level security is enforced per request at the database session.** Each user request runs `SET LOCAL ROLE byline_user` and sets `app.user_id`; signed-out visitors run as `byline_anon`. Helpers (`app.uid()`, `app.can_see_booking()`…) are SECURITY DEFINER so policies never recurse; EXECUTE is revoked from PUBLIC on every function; column grants keep `password_hash` and `ip_hash` unreachable; user-facing views are definer views with explicit `app.uid()` filters.
**Why:** RLS then protects even if application code has a bug; the same model works on any Postgres.
**Rejected:** Supabase-style JWT claims through PostgREST (needs Supabase); application-layer checks only.
**Status:** Active. Verified by SQL suite 03 and by mutation testing (D-059).

### D-053 · 2026-09-26T06:48Z · Phase 3
**Decision:** **Zero Postgres extensions.** UUIDs via built-in `gen_random_uuid()`, tracking codes via `uuid_send`, emails stored lowercase under a CHECK constraint (no citext), password hashing in Node (scrypt).
**Why:** Extension schemas differ between hosts (Supabase puts pgcrypto in `extensions`); none means the SQL runs unchanged everywhere.
**Rejected:** pgcrypto / citext.
**Status:** Active.

### D-054 · 2026-09-26T06:48Z · Phase 3
**Decision:** **App-owned authentication.** scrypt password hashes; a `sessions` table that stores only `sha256(token)`; an HttpOnly, SameSite=Lax, Secure-in-production cookie for 30 days; same-site-only `next` redirects; constant-work verification with a dummy hash for unknown emails; best-effort in-memory sign-in throttling (8 attempts / 10 min per IP+email).
**Why:** Follows from D-051; small, auditable and dependency-free.
**Rejected:** Supabase Auth; NextAuth (extra dependency); stateless JWT sessions (cannot be revoked).
**Status:** Active. Known limit: the throttle is per server instance.

### D-055 · 2026-09-26T06:48Z · Phase 3
**Decision:** **Live updates are polling, not Postgres realtime.** The Wire and campaign counters refresh by polling (Phase 6). This is the fallback pre-agreed in SPEC §7.5 and CLAUDE.md, now the default.
**Why:** Realtime came with Supabase; polling is enough for the demo and works on serverless hosting.
**Rejected:** LISTEN/NOTIFY + SSE (long-lived connections do not suit serverless).
**Status:** Active. Revisit if a Supabase project is adopted.

### D-056 · 2026-09-26T06:48Z · Phase 3
**Decision:** Migrations are **mutable until the first deployment**, applied in filename order with a `schema_migrations` tracking table; development uses `npm run db:reset`. From the first deploy on they become append-only.
**Why:** Faster iteration while nothing is deployed; the seed and tests always run from scratch.
**Rejected:** Append-only from day one (churn of dozens of fix-up migrations).
**Status:** Active.

### D-057 · 2026-09-26T06:48Z · Phase 3
**Decision:** Sandbox timing lives in a nullable **`bookings.auto_at`** (when the sandbox creator next acts), driven lazily by `sandbox_tick()` from the brand's own requests. Seeded states are frozen (`auto_at` null) except one accepted booking scheduled 25 s after a reset so the demo visibly moves.
**Why:** Explicit and testable; avoids inferring "when did this state start" from several timestamps; refines D-028.
**Rejected:** Cron; deriving delays from event timestamps.
**Status:** Active.

### D-058 · 2026-09-26T06:48Z · Phase 3
**Decision:** The demo world is built by one SQL function, **`app.seed_demo_state()`**, used by both the initial seed and `reset_demo()`. Clicks are derived from each creator's own impressions and CTR (not hard-coded), so every Receipt is internally plausible (cost per click €4–9). Maya Okafor is the only non-sandbox creator and is claimed by the demo creator login.
**Why:** One source of truth means reset can never drift from the seed; hard-coded click counts had produced an implausible 27% CTR.
**Rejected:** A separate reset script; fixed click numbers.
**Status:** Active.

### D-059 · 2026-09-26T06:48Z · Phase 3
**Decision:** Database correctness is proven by **five SQL suites** (ledger, state machine, RLS/privileges, tracking, sandbox), each run in a rolled-back transaction in a throwaway `byline_test` database, **and by mutation testing**: five deliberately broken rules were all caught. Several were caught by deeper layers than the one mutated (the `wallet_cents >= 0` CHECK and the `escrow_mismatch` guard).
**Why:** "Money cannot be lost" is a claim that needs evidence; passing tests I wrote myself can be vacuous.
**Rejected:** Application-level tests only.
**Status:** Active. Runs in CI against a Postgres 15 service.

### D-060 · 2026-09-26T06:48Z · Phase 3
**Decision:** Folder `db/` (migrations, seed, tests) replaces `supabase/` in the conventions; tooling scripts are `.mts` run with Node's native type stripping (Node ≥ 22.18; CI uses 24).
**Why:** Removes a build dependency (tsx) and matches D-051.
**Rejected:** tsx / ts-node.
**Status:** Active.

### D-061 · 2026-09-26T06:48Z · Phase 3
**Decision:** Environment: `DATABASE_URL` and `CLICK_HASH_SECRET` only. `.env.local` (gitignored, non-secret local values) is created for development; `.env.example` documents the hosted-database form (use the provider's pooled connection string).
**Why:** Two variables are all the backend needs.
**Rejected:** Supabase URL/anon/service keys.
**Status:** Active.

### D-062 · 2026-09-26T06:58Z · Phase 4
**Decision:** **Fit and projection are computed in the browser** over the whole public catalogue (40 rows sent to the client), using the same pure functions the server will use (`lib/fit.ts`, `lib/projection.ts`, 13 unit tests). Prices are never taken from the client: `place_hold` reads them from `creators.rate_cents`.
**Why:** Re-ranking is instant as the brief changes (no round trip per keystroke); at this catalogue size sending everything is cheaper than a query per change; the security-relevant number (price) stays server-side.
**Rejected:** A `/api/lineup` call per slot change; SQL scoring.
**Status:** Active. Revisit if the catalogue grows past a few hundred creators.

### D-063 · 2026-09-26T06:58Z · Phase 4
**Decision:** Committing a lineup runs **`create_campaign` and `place_hold` in one transaction** (`commitLineup` server action).
**Why:** A failed hold (say, insufficient funds) must leave nothing behind; separate calls would orphan a campaign.
**Rejected:** Two calls; creating the campaign when the brief is first edited.
**Status:** Active.

### D-064 · 2026-09-26T06:58Z · Phase 4
**Decision:** **The sandbox tick runs once per request, before anything reads**, via React `cache()` (`tickSandbox`), awaited by the layout and by every brand page.
**Why:** Found in live testing: layout and page render in parallel, so the page read bookings before the layout's tick committed and showed state one step stale. The database was right; the page was behind.
**Rejected:** Ticking only in the layout; ticking after render.
**Status:** Active. Refines D-028/D-057.

### D-065 · 2026-09-26T06:58Z · Phase 4
**Decision:** Desk behaviour: the campaign title defaults from the product, the destination link is required and validated inline, and a blocked commit says exactly why and offers "Fill in details" (which first closes the mobile sheet). A direct visit preloads a clearly-labelled **example brief**; URL parameters (taxonomy-filtered) can seed the brief, ready for the landing page's handoff in Phase 7.
**Why:** Time-to-first-lineup is near zero, and no dead end: every disabled state explains itself.
**Rejected:** Blank sentence on first visit; silently disabling the button.
**Status:** Active.

### D-066 · 2026-09-26T06:58Z · Phase 4
**Decision:** The brief sentence is the desk page's **`h1`** (axe `page-has-heading-one`).
**Why:** Screen-reader users navigate by heading; the sentence *is* the page's purpose.
**Rejected:** A separate visually-hidden heading.
**Status:** Active.

### D-067 · 2026-09-26T06:58Z · Phase 4
**Decision:** Live updates on the campaign page and the Wire use **`AutoRefresh`** (`router.refresh` every 5–8 s **only while the tab is visible**; the campaign page polls only while sandbox creators still have something pending).
**Why:** Implements D-055 cheaply and kindly: no polling in background tabs or when nothing can change.
**Rejected:** Always-on polling; websockets.
**Status:** Active. Side-effect noted in testing: a hidden browser pane never polls, and `requestAnimationFrame` counters do not animate there; both resume when visible.

### D-068 · 2026-09-26T06:58Z · Phase 4
**Decision:** Phase 4 simplifications: no "only within budget" filter, no persistence of an unsent brief across reloads, campaign page is a summary + bookings table (Run-of-show, review actions and tracked links arrive in Phase 6), creator sign-up shows an honest "opens in the next release" (Phase 5).
**Why:** Each is off the golden path for this slice.
**Rejected:** Building them now.
**Status:** Active.

### D-069 · 2026-09-26T12:18Z · Phase 5
**Decision:** **Function privileges are stripped with the global form** `ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` (edited into migration 0005, which is still mutable, D-056), and suite 03 now asserts that **no function in `public` or `app` is executable by PUBLIC**.
**Why:** Found by the Phase 5 suite: the `IN SCHEMA` form can only *add* privileges to the global defaults, so every function created after 0005 (including `reset_demo` and the `app.seed_*` helpers) had been executable by anyone. Each still refused unauthorised callers, so nothing was exploitable, but D-052's "nothing is callable by default" was not true until now.
**Rejected:** Adding explicit `REVOKE`s at the end of each migration (easy to forget); leaving it because every function checks the caller.
**Status:** Active. **Corrects** the claim in D-052.

### D-070 · 2026-09-26T12:18Z · Phase 5
**Decision:** **Creators self-serve their profile** through `save_creator_profile` (validated in the form, the server action and the database): handle rules and uniqueness, rate €20–€5,000, one to three verticals, self-reported audience shares. Typical impressions default to 18% of followers (range 0.7×–1.4×) and CTR starts at a neutral 1.00%. New creators are neither `verified` nor sandbox, and no "Verified" badge is shown anywhere.
**Why:** Real creators must appear in the brand catalogue on their own terms; we cannot verify LinkedIn stats (D-040), so pretending to would be dishonest.
**Rejected:** Admin-created creators only; auto-verifying self-reported numbers; asking for LinkedIn OAuth.
**Status:** Active.

### D-071 · 2026-09-26T12:18Z · Phase 5
**Decision:** **Drafts autosave** through `save_draft`, which stores the text without changing the booking's state or version; the client debounces 1.2 s after typing stops, and the server action skips revalidation so typing is never interrupted. Submitting is a separate, explicit act.
**Why:** Nobody should lose a draft; autosave must not be mistaken for a submission or notify the brand.
**Rejected:** Saving only on submit; localStorage drafts (lost across devices).
**Status:** Active. Verified: status went Unsaved → Saved, database held the text with the booking still `accepted`, version 0.

### D-072 · 2026-09-26T12:18Z · Phase 5
**Decision:** Creator information architecture: **Offers** is only the decision inbox (invited bookings, two big buttons); **Deals** is the pipeline by stage (To write · In review · To post · Live · Paid) with the next action named on every card; **Deal** is the one page where you do the next thing. Phones stack the stages; ≥1280 px shows a five-column board.
**Why:** One decision per screen on a phone; the pipeline answers "what do I owe whom" at a glance.
**Rejected:** A single mixed list; a kanban on phones.
**Status:** Active.

### D-073 · 2026-09-26T12:18Z · Phase 5
**Decision:** Creator sign-up is open in `/join`; a creator without a profile is redirected to `/onboarding` from every creator page. The public media kit `/c/[handle]` was built now (planned for Phase 7) because the kit editor previews it.
**Why:** The creator flow is not real until a stranger can join, set a price and be bookable. The kit is the natural preview target.
**Rejected:** Leaving creator sign-up as "opens in the next release" until Phase 7.
**Status:** Active. **Reverses** the creator-sign-up part of D-068.

### D-074 · 2026-09-26T12:18Z · Phase 5
**Decision:** **Notifications are real for both roles**: the bell opens the latest 8 with unread highlighted and a "Mark all read" action (`mark_notifications_read`); a creator's ticker carries their notifications.
**Why:** A bell that does nothing is worse than none.
**Rejected:** A decorative bell; a full notifications page.
**Status:** Active.

### D-075 · 2026-09-26T12:18Z · Phase 5
**Decision:** **Process:** every server-action file must export literal `async function`s (arrow functions that return promises fail the Next build). Typecheck and lint do not catch this, so visual verification always checks the dev error overlay.
**Why:** Found only because a screenshot showed the overlay.
**Rejected:** Trusting tsc + eslint.
**Status:** Active.

### D-076 · 2026-09-26T12:18Z · Phase 5
**Decision:** **Commit cadence:** commit at each coherent slice inside a phase (database, then each UI slice), each with the logs, and finish every phase with a docs commit (CLAUDE.md status + DECISIONS). Nothing is pushed until the user says so.
**Why:** The user asked for history that shows the real build order; per-phase commits alone hid the slices.
**Rejected:** One commit per phase; one commit per file.
**Status:** Active. Phases 0–4 were committed per phase; Phase 5 onward per slice.

### D-077 · 2026-09-26T12:30Z · Phase 6
**Decision:** **The tracked link is built as specified in D-039 and hardened**: `/go/[code]` answers 302 first and records the click in `after()`; crawlers and link unfurlers are stored but flagged and never counted; HEAD requests and prefetches record nothing; the visitor id is `sha256(ip|ua|UTC day|secret)` (raw IPs are never stored, and the same person is unique once per day); referrers are kept as a host only; UTM parameters are added without overriding the brand's own; per-IP throttle of 240 requests a minute (in-memory, best effort); unknown or malformed codes 404 on the on-brand not-found page.
**Why:** A reader never waits on our database, a Receipt only counts people, and we hold as little personal data as possible.
**Rejected:** Insert-then-redirect; counting every hit; storing IPs; a third-party link shortener.
**Status:** Active. 11 unit tests plus a live `curl` audit (3 people, a repeat visitor, LinkedInBot, Googlebot, HEAD, prefetch, two bad codes: totals moved by exactly the expected amounts).

### D-078 · 2026-09-26T12:30Z · Phase 6
**Decision:** **The booking drawer is the one place a brand acts on a booking**: review a draft (Approve / Request changes with a required note of at least 5 characters), Cancel offer, Release payout, view the tracked link and results, and revoke or restore the public Receipt. It shows the state the server sends, so every action updates it in place; irreversible actions (release, cancel) ask for confirmation first.
**Why:** One consistent, accessible surface (a right-hand sheet, full width on phones) instead of scattering buttons across a table; no action can be double-fired from stale UI.
**Rejected:** Inline row buttons; a separate booking page.
**Status:** Active.

### D-079 · 2026-09-26T12:30Z · Phase 6
**Decision:** **Run-of-show** draws each booking as a block from its offer to its publish-by date (at least two days wide), with a "Today" marker; live and paid blocks carry unique clicks and a gap-free daily sparkline; below 768 px it becomes an agenda list with the same facts.
**Why:** The brief's "campaign as a calendar" — it shows at a glance what is late, what is live and what is finished.
**Rejected:** A generic Gantt library; a plain table only.
**Status:** Active.

### D-080 · 2026-09-26T12:30Z · Phase 6
**Decision:** **Receipts** (`/receipt/[code]`) are public but unlisted (`noindex`), say exactly what is verified (clicks, counted by Byline) and what is not, and label the impressions source ("self-reported" vs "sandbox, simulated"). The brand can revoke or restore the link (`set_receipt_public`). The creator's public kit lists their paid Receipts as proof.
**Why:** Trust comes from being explicit about provenance; revocability protects brands (D-038).
**Rejected:** Login-gated receipts; hiding the impressions caveat.
**Status:** Active. Refines D-038.

### D-081 · 2026-09-26T12:30Z · Phase 6
**Decision:** Polling cadence: the campaign page refreshes every 6 s while a sandbox creator has something pending or a post is live; the deal page every 8 s while live; both role layouts add a baseline 20 s refresh; all of it only while the tab is visible.
**Why:** The Wire ticker, bell and counters stay alive everywhere without hammering the database or background tabs.
**Rejected:** Always-on polling; a single global interval.
**Status:** Active. Refines D-067.

### D-082 · 2026-09-26T12:30Z · Phase 6
**Decision:** **Cost per click** is spend on live and paid posts divided by their unique clicks, unsmoothed: a post that has just gone live with no clicks yet raises it until clicks arrive.
**Why:** It is what the money actually bought so far; smoothing it would hide a real signal from the brand.
**Rejected:** Excluding posts with zero clicks; a rolling average.
**Status:** Active. Observed in testing (€7.44 → €12.65 when a sandbox post went live).

### D-083 · 2026-09-26T12:30Z · Phase 6
**Decision:** Front-end rules learned the hard way in Phase 6: (a) server components cannot pass functions to client components (`Metric` takes a `kind` string, not a formatter); (b) `sr-only` text inside a scroll region escapes its clip unless the region is `relative` (it widened the whole page on phones; `Table` now guards this); (c) read browser-only values with `useSyncExternalStore`, not an animation frame that pauses in background tabs (`CopyField`).
**Why:** Each cost a debugging round; each is now enforced by the shared component that hit it.
**Rejected:** Fixing them ad hoc per page.
**Status:** Active.

### D-084 · 2026-09-26T12:30Z · Phase 6
**Decision:** **The golden loop was proven with two real users and no sandbox shortcuts**: the demo creator accepted an offer, autosaved and submitted a draft on a phone-sized screen; the brand approved it; the creator published (a malformed URL was rejected inline first) and received a tracked link; five reader visits (one repeat, plus a crawler) produced "+5 clicks · Maya Okafor · Launch Q4" on the Wire; the brand released the payout. Afterwards: every ledger transaction nets to zero, wallet and balance caches equal the ledger, escrow equals price for every in-flight booking, the creator's balance rose by exactly the price, her public kit lists the new Receipt, and the Receipt page shows "Paid to creator" with impressions "not reported".
**Why:** The whole product claim is this loop; it deserves an end-to-end proof rather than piecemeal checks.
**Rejected:** Trusting per-slice tests only.
**Status:** Active. To become a Playwright test in Phase 8.

### D-085 · 2026-09-26T12:47Z · Phase 7
**Decision:** **The landing page's hero is the product.** A visitor writes a brief and a ranked lineup of real creators appears, from the public API and the real database, with no account. The first ranking is rendered on the server (nothing flashes empty); edits are debounced (250 ms), cancel the previous request, and show a status line, an error state with retry, and keep the last good lineup if a refresh fails. Below it: the four nouns with tiny live visuals, a **real** Receipt (paid, most unique clicks) as proof, creators, pricing, FAQ. If the database is down the page still renders and the live desk explains itself.
**Why:** Time-to-value before sign-up, and a first impression that is itself a demonstration of the real backend, replacing Naano's 48-hour human shortlist form (D-016).
**Rejected:** A static hero with a marketing mock; a logo wall or testimonial block; an email-gated shortlist.
**Status:** Active. Verified: three rapid edits produced one request and re-ranked the list; axe 0 violations at 375 and 1440.

### D-086 · 2026-09-26T12:47Z · Phase 7
**Decision:** **A brief travels.** `lib/brief-params` parses and serialises a brief in a URL (taxonomy-filtered, capped, budget in whole euros; 6 tests). "Book this lineup" links to `/login?next=/desk?…`; the demo login and registration honour a same-site `next`; the desk arrives pre-filled and drops the "example brief" hint.
**Why:** The visitor's work is never thrown away between the landing page and the product.
**Rejected:** Storing the brief in a cookie or in browser storage (invisible, breaks across devices and shared links).
**Status:** Active. Completes the URL-brief hook planned in D-065. Verified end to end in the browser.

### D-087 · 2026-09-26T12:47Z · Phase 7
**Decision:** **Public read API**: `GET /api/lineup` and `GET /api/creators/{handle}`, CORS-open, `Cache-Control: public, s-maxage=30, stale-while-revalidate=120`, throttled at 60 requests a minute per IP (verified: 60 × 200 then 429, other clients unaffected), errors as JSON with a stable code. Response shapes live in `lib/api-shapes.ts` and are shared with `/developers`, whose examples are produced by the same code. **The `budget` parameter is whole euros** (SPEC §8 said cents; amended).
**Why:** The landing page dogfoods it, so it is real and cannot rot; docs generated from the code cannot drift.
**Rejected:** Hand-written docs; an authenticated API; a GraphQL layer.
**Status:** Active.

### D-088 · 2026-09-26T12:47Z · Phase 7
**Decision:** Landing voice and structure: a front page, not a SaaS template. Ruled sections instead of cards, a serif display type with one italic turn, mono datelines with real numbers from the database, a definition-list pricing block, an accordion FAQ whose answers include what is **not** built. All copy is original.
**Why:** Distinctness is part of the brief (D-014) and honesty is the product's whole stance.
**Rejected:** Card grids, gradient sections, a logo wall, stat tiles, video testimonial, floating AI bar (the anti-list).
**Status:** Active.

### D-089 · 2026-09-26T12:47Z · Phase 7
**Decision:** `robots.ts` indexes the landing page, `/developers` and creator kits (`/c/`) and disallows the app, Receipts, `/go/`, `/api/` and the styleguide; `sitemap.ts` lists creator kits from the database and never fails the request.
**Why:** Kits are public shop windows; Receipts are unlisted by design (D-038) and must stay out of search.
**Rejected:** Indexing everything; no robots file.
**Status:** Active. Needs `NEXT_PUBLIC_SITE_URL` once deployed.

### D-090 · 2026-09-26T13:40Z · Phase 8
**Decision:** **Nothing fails ugly.** `loading.tsx` skeletons for both app areas (same grid as the real page, so no layout shift); `error.tsx` at the root and in each area plus `global-error.tsx`, each with a retry and a plain-language message; security headers on every response (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, no `X-Powered-By`) and, in production only, a CSP (`default-src 'self'`, inline scripts/styles allowed because Next's bootstrap is inline and nonces would make every page dynamic; `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`) and HSTS. **`/go/[code]` answers a database outage with a 503 page and `Retry-After`, never a raw 500**: that link sits on someone else's LinkedIn post.
**Why:** The tracked link and the app are what strangers touch first; a graceful failure is part of the product. Outage drill: database stopped → landing still renders with an explanation, `/go` returns the 503, app pages show the error panel; restarted → everything recovers without a redeploy.
**Rejected:** A nonce-based CSP (forces dynamic rendering everywhere, costs caching for a marginal gain here); a spinner-only loading state.
**Status:** Active.

### D-091 · 2026-09-26T13:40Z · Phase 8
**Decision:** **End-to-end tests run against the production build and a freshly reset real Postgres**, in numbered specs that share one database and run serially (read-only first, mutating last): (1) security and roles, (2) 18 screens × 7 widths (320 → 1920) each checking horizontal overflow, axe WCAG 2.2 AA, 44 px touch targets on touch widths, and a silent console, (3) the **golden loop with two brand-new people** through the real UI (join, price, brief, fund, hold, accept, draft, changes, revise, approve, live, three readers, payout, public Receipt) followed by an audit of the whole ledger, (4) keyboard and reduced motion, (5) concurrency and privilege (double Release, accept vs decline, racing holds, cross-role writes), (6) an iPhone-sized **WebKit** run of the money path. 64 tests (62 plus two sign-in setups); `npm run e2e` locally, and CI runs it after the build with Chromium and WebKit installed.
**Why:** The claim is a working product; the tests exercise it the way a stranger would, on the artefact that ships, and they found five real defects (D-092 … D-096) that unit and SQL tests could not.
**Rejected:** Mocking the database in e2e; testing only against `next dev` (different code paths, no CSP); a single giant test.
**Status:** Active. Test-only accommodations, each commented where it lives: axe's `target-size` is off (a sticky bar covering a button at the current scroll position counts as "undersized"; our own 44 px measurement is stricter); the 404 page's console line is expected; Safari's "access control checks" line for a link prefetch cancelled by navigation is ignored.

### D-092 · 2026-09-26T13:40Z · Phase 8
**Decision:** **Deep links survive sign-in.** `src/proxy.ts` passes the requested path and query to server components (`x-byline-here`, `_rsc` stripped); `requireRole` uses it for the `next` parameter, and `safeNext` still allows same-site paths only.
**Why:** Found by e2e: opening `/campaigns/<id>` signed out sent you to `/desk` afterwards, because the area's layout redirects before the page can. Anyone following a link from a notification lost their place.
**Rejected:** Passing the path from every page (the layout runs first anyway); a cookie.
**Status:** Active. Off-site `next` values (`https://…`, `//…`, `/\…`) are tested to fall back to the home page.

### D-093 · 2026-09-26T13:40Z · Phase 8
**Decision:** **The session cookie is `Secure` only when the request arrived over HTTPS** (`x-forwarded-proto`), not whenever `NODE_ENV` is production. Still `HttpOnly`, `SameSite=Lax`.
**Why:** Found by the WebKit run: Safari refuses `Secure` cookies on `http://localhost`, so anyone running the production build locally in Safari could not stay signed in (the server actions answered "session ended"). On Vercel the header is always `https`, so nothing changes there.
**Rejected:** Dropping `Secure` in production (weaker); telling reviewers to use Chrome.
**Status:** Active.

### D-094 · 2026-09-26T13:40Z · Phase 8
**Decision:** **Compact controls are for fine pointers, not for a width.** Small buttons and the brief-sentence chips are 44 px tall by default and 36 px only under `pointer-fine`; the responsive test runs widths up to 1024 as a touch device (`hasTouch`) and wider as a mouse. Replaces the `md:` breakpoint approach.
**Why:** An iPad at 768 or 1024 is a touch device; a breakpoint made its buttons 36 px.
**Rejected:** Making everything 44 px on desktop (a roster of dense rows needs the density).
**Status:** Active.

### D-095 · 2026-09-26T13:40Z · Phase 8
**Decision:** **On phones the tray sheet pins its primary action.** The hold button sticks to the bottom edge of the sheet (with the safe-area inset), so it is never below the fold on a 667 px screen; the sheet no longer pads for the inset itself.
**Why:** Found on an iPhone-sized WebKit run: the hold button sat 200 px below the fold under totals and a budget meter, so the core action needed a scroll inside a scroll.
**Rejected:** Shrinking the summary (it is the point of the tray).
**Status:** Active.

### D-096 · 2026-09-26T13:40Z · Phase 8
**Decision:** **Keyboard pass.** One skip link in the root layout (every page's `<main>` is `id="main"`), replacing the app shell's private one; sheets and confirmation dialogs remember what had focus when they opened and give it back on close.
**Why:** Found by the keyboard e2e: our dialogs open from state (a hold button, a table row), so Radix, which returns focus to a Trigger, dropped focus to `<body>`; public pages had no skip link at all.
**Rejected:** Wrapping every opener in `Dialog.Trigger` (the openers are conditional and live in other components).
**Status:** Active. Tested: Tab order shows a focus ring on every stop; the hold is fully operable by keyboard; Escape returns focus; with reduced motion one click opens the confirmation.

### D-097 · 2026-09-26T13:40Z · Phase 8
**Decision:** **Concurrency and privilege are tested, not assumed.** Two Release calls at once pay once; accept and decline at once leave exactly one winner and a ledger that adds up; two holds that together exceed the wallet cannot both succeed (`insufficient_funds`, wallet never negative); a creator or the wrong brand cannot approve, pay, insert ledger rows or edit a balance. The whole-database audit (transactions net to zero, caches equal ledger, escrow equals price for open deals and zero for closed ones, no negative wallet) runs after the golden loop and after these.
**Why:** Money is the one place a double-click must not matter.
**Rejected:** Relying on the UI's disabled-while-pending state.
**Status:** Active.

### D-098 · 2026-09-26T13:40Z · Phase 8
**Decision:** **Quality bar, measured.** Lighthouse (mobile, simulated slow 4G, production build): landing 91 / 100 / 100 / 100 (performance / accessibility / best practices / SEO), creator kit 96 / 100 / 100 / 100, developers 96 / 100 / 100 / 100, sign-in 96 / 100 / 100 / 100, Receipt 94 / 100 / 100 / 63; the landing scores 99 with applied throttling (LCP 1.7 s, TBT 20 ms, CLS 0). The Receipt's SEO 63 is deliberate: it is `noindex` (D-038, D-089). Back/forward cache is not used because dynamic pages send `no-store`; accepted. Real **iOS Safari** (simulator, iPhone SE 3rd generation, iOS 18.3, 375 × 667): landing, creator kit, Receipt and developers render correctly; interactive flows are covered by the WebKit run because access to drive the simulator's touch input was not granted.
**Why:** "Best of the best" needs numbers, and honest ones.
**Rejected:** Chasing a 100 on the simulated-throttle performance score (the remaining gap is the model's font-swap pessimism, not the page).
**Status:** Active.

### D-099 · 2026-09-26T13:40Z · Phase 8
**Decision:** Another party's booking or campaign returns the **not-found page** (not 403), so it does not confirm the id exists. Because the page streams behind a `loading.tsx` skeleton, the HTTP status is 200 with the not-found body and `noindex`; nothing about the record is in the response. Accepted for private, `Disallow`ed pages.
**Why:** Keeping the skeletons (D-090) is worth more than a 404 status on pages no crawler may visit.
**Rejected:** Removing `loading.tsx` from detail routes.
**Status:** Active.

### D-100 · 2026-09-26T14:50Z · Phase 9
**Decision:** **Secrets never enter the conversation, by construction.** The database tool (`scripts/db.mts`) gained TLS for non-local hosts, `check` (can this database host Byline: version, role privileges, migration state, pooled-vs-direct hint), `reset-demo` (restore the demo world; safe on a live database) and `cleanup-e2e`. Hosted credentials go in a gitignored `.env.remote`, read by `npm run db:remote -- <command>` and `npm run e2e:live`, so the agent can run them without ever seeing the URL. `reset` still refuses non-local databases without `--force`.
**Why:** Prompts are logged verbatim into a public repo (CLAUDE.md rule); the deployment step is exactly where a connection string would be pasted. The pooled/direct distinction is the most common hosted-Postgres failure, so the tool says which it sees.
**Rejected:** Asking the user to paste the URL; reading `.env.local` in the scripts (it holds the local URL); a dashboard-only setup with no verification step.
**Status:** Active. Verified locally; the hosted path (TLS, role creation on Neon/Supabase) is unverified until a hosted database exists.

### D-101 · 2026-09-26T14:50Z · Phase 9
**Decision:** **The e2e suite can target the live site** (`E2E_BASE_URL` plus that site's `DATABASE_URL`): no local server, the demo world is restored first and **everything the tests created is removed afterwards** (accounts on `example.test`, their campaigns, bookings and ledger legs; balances recomputed; demo state reseeded), so the public roster is exactly as seeded. Three tests that spoof a client IP (API throttle, sign-in throttle, click de-duplication) skip on a live site, and the golden loop accepts one visitor instead of two.
**Why:** The original Phase 8 plan asked for e2e on the live URL, and it is the strongest proof that the deployment, not just the code, works. A test that leaves fake creators on the public landing page would be worse than no test.
**Rejected:** A separate smoke suite (drifts from the real one); running e2e against production without cleanup.
**Status:** Active. Dry run: the whole suite in live mode against the local server, 61 passed / 3 skipped, and creator/account/brand/booking counts returned to 40 / 4 / 3 / 8.

### D-102 · 2026-09-26T14:50Z · Phase 9
**Decision:** `siteUrl()` uses `NEXT_PUBLIC_SITE_URL`, else Vercel's production hostname, else localhost, and feeds `metadataBase`, `robots.txt` (now with the sitemap line) and the sitemap. Open Graph card: a **static PNG of the real landing hero** (1200 × 630) with alt text, plus `og:title/description` and `twitter:card`.
**Why:** One fewer environment variable to get wrong at deploy time; a shared link should look like the product. A screenshot is on-brand (real fonts, real data) and needs no font loading at the edge, which `ImageResponse` would.
**Rejected:** A generated OG image with default fonts (off-brand); no card.
**Status:** Active. Re-take the image if the landing hero changes.

### D-103 · 2026-09-26T14:50Z · Phase 9
**Decision:** **Connection pool hardened for hosted databases**: a listener on the pool's `error` event (an idle socket dropped by a pooler is otherwise an uncaught exception that kills the instance), a 10 s connect timeout (fail with an error page, not a hang), 10 s idle timeout and TCP keep-alive.
**Why:** Serverless instances freeze and hosted poolers drop idle connections; this is the class of failure that works on a laptop and breaks in production.
**Rejected:** Leaving defaults; a larger pool (the pooler, not the app, owns concurrency).
**Status:** Active.

### D-104 · 2026-09-26T14:50Z · Phase 9
**Decision:** **The submission kit is part of the product.** `README.md` (idea, what's real, architecture / ERD / lifecycle diagrams, how to run and test, cut list with reasons, how it differs from the inspiration, how the agent was used), `DEPLOY.md` (Neon or Supabase + Vercel in about 20 minutes, with the failure table), `SUBMISSION.md` (order of work, a timed 5-minute walkthrough script with the golden path click by click, the 1-minute intro structure, likely questions) and `npm run submission:check`, a gate that fails until the README links are real, the live `/api/health` reports a connected database, the landing page is open signed-out, the GitHub repo is public and fully pushed, the tree is clean, `.agent-logs` exist and are not ignored, and no env file or secret-shaped string is tracked (patterns tested against samples).
**Why:** The hand-in is judged on what a stranger can open in five minutes; a checklist that can fail is more reliable than one that can be ticked.
**Rejected:** A README written after the fact; a manual checklist only.
**Status:** Active. The intro video's content is the user's (something not on their CV); only its structure is supplied.

### D-105 · 2026-09-26T14:50Z · Phase 9
**Decision:** **Correction (reverses a claim, not a decision).** The Phase 8 docs commit and the end-of-phase summary said the corrupted `## Concept## Concept…` heading in CLAUDE.md had been fixed. The regular expression did not match, so nothing changed; the heading was fixed for real in the Phase 9 commit. The corruption itself came from earlier scripted edits that re-inserted the heading text.
**Why:** The log is part of what is being judged; a false "done" that stays uncorrected is worse than the typo.
**Rejected:** Silently fixing it.
**Status:** Fixed. Lesson kept: after a scripted edit, assert the resulting text (`grep`) instead of trusting the script's exit code.

### D-106 · 2026-09-26T15:54Z · Phase 9
**Decision:** **The hosted database is live and verified.** Neon (Postgres 18.6, `us-east-2`): `db:check` passed, all 8 migrations applied on the **direct** host (the saved string was the pooled one; `-pooler` was removed from the host in `.env.remote` without ever printing it) and the seed loaded (40 creators, 3 brands, 8 bookings). The production build run locally against it passed the whole e2e suite in live mode: 61 passed, 3 skipped (IP spoofing), with the test data removed afterwards. Two WebKit phone tests first failed on `TypeError: Load failed`: Safari's wording for the app's own `router.refresh()` being cancelled when the test navigated away right after the toast, made visible by the extra latency to Neon. The WebKit spec now treats that message as cancelled-request noise (the UI assertions still catch real failures).
**Why:** The tooling had only ever run against local Postgres; role creation, `SET LOCAL ROLE` under RLS, TLS and the pool configuration are exactly what differs on a hosted database, and this run exercised all of them.
**Rejected:** Migrating through the pooler; loosening the console-error guard for every browser.
**Status:** Active. Still to do: Vercel (with the **pooled** string as `DATABASE_URL`), then the same suite against the deployed URL.

### D-107 · 2026-09-26T16:02Z · Phase 9
**Decision:** The e2e web server's readiness probe is `/login`, not `/api/health`.
**Why:** The first CI run failed with "Timed out waiting 120000ms from config.webServer". Playwright starts the server *before* `globalSetup` migrates and seeds the database; `/api/health` is 503 on an empty database (CI's), so the server was never "ready". Locally the database already existed, which hid it. Reproduced with `CI=1` and an empty database, then fixed: 64 passed.
**Rejected:** Migrating in a separate CI step only (would leave local `npm run e2e` on a fresh machine broken); accepting 503 as ready.
**Status:** Active.

### D-108 · 2026-09-26T16:18Z · Phase 9
**Decision:** **Deployed and verified in production:** https://nanooinspired.vercel.app (Vercel, function region `iad1` next to Neon `us-east-2`; pooled Neon URL in the app, direct URL for tooling). Verified from outside: `/api/health` reports the database connected (40 creators, 8 migrations); landing, sign-in, developers, a creator kit, robots, sitemap (built from Vercel's own hostname) and the Open Graph image all answer 200 with the security headers (CSP, HSTS, `X-Frame-Options`, `nosniff`); the whole e2e suite ran against the live URL (59 passed, 3 skipped for IP spoofing; the 2 iPhone-WebKit tests passed after their own navigation race was fixed) and removed its data afterwards. Lighthouse on the live site, mobile with simulated throttling: landing 93 / 100 / 100 / 100, creator kit 89 / 100 / 100 / 100 (performance / accessibility / best practices / SEO; total blocking time varies run to run on this machine).
**Why:** The claim to be judged is a working deployed product; this is the evidence, run on the artefact a stranger opens.
**Rejected:** Declaring it done because health is green.
**Status:** Active. The WebKit smoke test now waits for a client navigation or a router refresh to settle before starting another navigation: with real network latency, `page.goto` was interrupted by the app's own in-flight navigation (a test race, not an app defect).
