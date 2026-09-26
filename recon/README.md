# recon/ — what we learned about the reference product

Purpose: understand **flows, data and mechanics** of the reference product so ours is complete and credible.
**Not** a source of visuals, copy, names, stats or people — those are on the "never touch" list in [../PLAN.md](../PLAN.md) §2.

## A. Public-page findings (agent, 2026-09-26; own words)
Sources: home, `/creators`, `/register`, `/selection`, `/free-tools`, `/help`, `llms.txt`, `pricing.md`; desktop and 375 px mobile.

**Model.** Two-sided marketplace. Brands book vetted LinkedIn creators for sponsored posts; each creator sets a flat price per post (entry from ~€20).
No cost per click or impression. Two brand plans (free self-serve; paid managed service). Creators are promised fast payout and no exclusivity.
**Money flow (from their pricing doc).** Brand books → creator publishes → brand reviews/approves → creator paid automatically (card-payments partner). Naano handles invoices/approval records.
**Role split.** Sign-up first asks *creator or brand*. There is a separate agency audience in the nav.
**Brand surface (from marketing preview only).** Marketplace of creator cards with a "matching" score, followers, median views, post price; a narrow icon rail; a floating natural-language search bar; a campaign brief step with AI assistance; collaboration statuses (draft ready / scheduled / live); attribution figures; payout scheduled.
**Creator surface.** Media kit, starting rate, collaboration requests (accept/decline with date and deliverables), performance view, instant-payout messaging, "bring your own deals".
**Free tools.** A human-built shortlist within 48 h (email form) and several calculators. We replace the shortlist with an instant lineup and cut the calculators (see DECISIONS D-022).
**Look.** Pale-blue sky with clouds, frosted-glass cards, bold tight Inter-like type, black pill buttons, blue accents, logo wall, video testimonial, stat tiles. → our anti-list ([../design/BRIEF.md](../design/BRIEF.md) §2).
**Not seen:** the logged-in app. The Help Center is only a contact page.

## B. Logged-in walkthrough (the user; in progress)
The agent cannot create accounts. While in the app, capture screenshots and answer the questions in [../SPEC.md §12](../SPEC.md).

**Folder layout**
```
recon/
  README.md            this file
  NOTES.md             your answers to SPEC §12 + anything surprising (one bullet per screen is enough)
  brand/    01-signup.png 02-onboarding.png 03-marketplace.png ...   (numbered in the order you saw them)
  creator/  01-signup.png 02-onboarding.png 03-offers.png ...
  public/   (optional) anything from the logged-out site worth keeping
```
**Per screen, note:** URL path · what the user can do · fields/inputs · statuses/labels shown · empty / loading / error states · anything confusing or slow.
**Don't** include real personal data, other people's profiles, or anything containing a password/API key/token/card number in a screenshot — this folder is committed to a public repo. Blur or crop first.
**Done when:** every brand and creator screen you can reach has a screenshot, and NOTES.md answers SPEC §12 (or says "not visible").

## C. How recon feeds the build
NOTES.md → adjusts SPEC.md (flows, statuses, fields) → logged in DECISIONS.md if it changes scope or schema. Anything that annoyed you in their app is a design opportunity for ours.
