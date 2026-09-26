# Submission kit

Four labelled links go in the hand-in: **Live · Repo · Walkthrough · Intro**. This page is the checklist, the 5-minute walkthrough script, and the questions to be ready for.

## The gate

```bash
npm run submission:check
```

It fails until: the README's three links are real; the live site answers `/api/health` with a connected database and the landing page is open to signed-out visitors; the GitHub repo is public and everything is pushed; the working tree is clean (the final `.agent-logs` commit included); `.agent-logs/` is present and not ignored; no env file or secret-shaped string is tracked. Run it last, after the final commit and push.

## Order of work (after the database and Vercel exist; see DEPLOY.md)

1. `npm run db:remote -- check` → `migrate` → `seed`; deploy on Vercel; `curl …/api/health`.
2. `npm run e2e:live` (restores the demo world, runs everything, cleans up).
3. Open the live site on **your phone** and in a private window on desktop; walk the golden path once, by hand.
4. `npm run db:remote -- reset-demo` immediately before recording.
5. Record the walkthrough, then the intro. Upload (Loom, YouTube unlisted, or Drive with link sharing on). **Open both links in a private window** to be sure a stranger can watch them.
6. Put the four URLs into the README's table (replace `LIVE_URL`, `WALKTHROUGH_URL`, `INTRO_URL`).
7. Update `CLAUDE.md` STATUS (Phase 9 done), commit **with the final `.agent-logs`**, `git push`, then `npm run submission:check` → "ready to submit".

## Walkthrough: 5 minutes, camera on

Record in one take with the camera visible (a corner bubble is fine). Use a private window on the live URL, browser zoom ~125 %, notifications off. Have your phone ready with the live URL open on the landing page. Keep each part to its time box; the numbers are a budget, not a script to read.

| Time | Show | Say (in your own words) |
|---|---|---|
| **0:00–0:30** | Your face, then the landing page | Who you are; the assignment (rebuild the idea behind a B2B LinkedIn-creator marketplace as an original product with a real backend); what you'll show: the live product, three design decisions, how you worked with the agent |
| **0:30–1:15** | Landing page, the live desk | What the inspiration does (brands book vetted creators at a flat price; tracked links; payout). What you **kept** (the two-sided idea, creator-set price, fit before follower count, tracking). What you **reinvented**: the brief *is* the search: edit a slot in the sentence, the real lineup re-ranks, no sign-up. Point at the fit bar and a "why" chip |
| **1:15–3:45** | The golden path, live | See below |
| **3:45–4:30** | `/styleguide`, a Receipt, the hold button | Three decisions, one sentence each: **the brief is the search** (time-to-value before sign-up; it's a public API the landing page eats); **the Receipt** (public proof that says what it cannot vouch for: impressions are labelled self-reported, clicks are verified by our own redirect); **hold to commit** (money into escrow is a deliberate gesture, with a keyboard/confirm equivalent) |
| **4:30–5:00** | Repo: `CLAUDE.md`, `DECISIONS.md`, the e2e list | How you worked with the agent: one source-of-truth file updated every phase, an append-only decision log with rejected options, commits per slice with the logs alongside; the e2e suite found six real bugs (name two); what you cut and why (real payments, LinkedIn API, realtime → polling) and what's next (AI brief parsing, shared rate-limit store) |

### The golden path (1:15–3:45), step by step

1. **Landing → *Enter as the demo brand*.** The desk opens with the brief pre-filled.
2. Add **three creators** to the Tray. Say: the Tray shows a *range* of clicks and cost per click before any money moves; a creator over budget is flagged.
3. **Fill in the destination link** if asked (the hold says why it's blocked), then **press and hold** *Hold to place in escrow*. Say: the wallet drops, escrow rises, one transaction; the ledger can't be unbalanced (the database refuses it). You land on the campaign board: three offers, "Invited".
4. **Switch to your phone** (or a narrow window): open the live URL → *Enter as the demo creator*. **Accept** the offer, write two lines, **Submit draft**. Say: this side is mobile-first; the draft autosaves.
5. **Back on desktop, as the brand**: open the draft, **Request changes** once (type a short note), then have the creator revise (a sandbox creator, Tobias Krause, replies by himself within seconds if you'd rather not switch devices), then **Approve**.
6. **Creator: *Mark as live*** with any link. Show the **tracked link**. Open it in a new tab (it redirects; say: 302 first, counted after, once per person per day, bots ignored). Do it twice.
7. **Brand: the Wire ticker** shows the click; the board's counter moves. Open the drawer → **Release payout**. Say: escrow → creator, exactly the price, no fee taken.
8. Click **Open the Receipt** in the drawer (public, no login). Point at *Verified by redirect*, *impressions: self-reported*, *Paid to creator*.

If something misbehaves live, don't fight it on camera: say so, run `npm run db:remote -- reset-demo` off-camera and retake that step. Sandbox creators reply after ~8–25 s, so fill the wait with a sentence about how they work (clearly labelled; a lone reviewer can complete the loop).

## Intro video: 1 minute, camera on

The brief asks for something **not on your CV**. That has to be yours; nobody else can supply it. A shape that works in 60 seconds:

- **Hook (0–10 s):** one concrete thing, stated plainly (a hobby, a place, a project, an obsession).
- **Story (10–40 s):** one specific moment or detail: what you did, what went wrong or surprised you, what you learned. Numbers and names beat adjectives.
- **Bridge (40–55 s):** one sentence connecting it to how you work (patience, taste, speed, sweat over details), without claiming a skill you didn't just demonstrate.
- **Close (55–60 s):** stop. No summary.

Don't read from a script; a phone propped at eye level with a window in front of you is enough.

## Questions to be ready for

- **Why not Supabase?** Portable Postgres with row-level security enforced per request, no vendor SDK and no extensions: it runs anywhere, and the security model is in SQL you can read (D-051). Auth is app-owned for the same reason.
- **How do you know the money is right?** Integer cents; an append-only double-entry ledger with a deferred trigger that rejects any unbalanced transaction; wallet and balance are caches reconciled to it; SQL tests plus an e2e audit of the whole ledger after a full two-user loop; two Release clicks at once pay once (race tests).
- **Is the data real?** The database, API, auth, ledger, tracked links and clicks are real. The 40 creators are fictional and their impressions are seeded and labelled; there is no LinkedIn access and no real payment (a test-mode wallet).
- **What would you do next?** Shared rate-limit store; real payments provider; AI brief parsing; email notifications; a creator-side "bring your own deals" flow.
- **What did the agent get wrong?** Default privileges (a test caught it, D-069); server-action file rules that neither `tsc` nor ESLint catch (D-075); a doc fix reported as done that hadn't applied. All are on the record in the logs and `DECISIONS.md`.
- **What's the biggest risk in production?** Per-instance in-memory rate limits (D-054); the CSP allows inline scripts (D-090).

## Links block (paste into the form)

```
Live:         https://nanooinspired.vercel.app
Repo:         https://github.com/rahuljuluru92/nanoo_inspired
Walkthrough:  <WALKTHROUGH_URL>
Intro:        <INTRO_URL>
```
