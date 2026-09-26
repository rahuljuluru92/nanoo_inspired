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
