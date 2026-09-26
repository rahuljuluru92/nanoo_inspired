# DESIGN BRIEF — Byline

The visual and interaction rules. Phase 2 turns this into tokens, components and a `/styleguide` page. Concept: **newsprint × trading desk** —
warm printed-page trust for the words, terminal precision for the numbers. The product should feel *authored*, calm, exact, and a little theatrical at the moments money moves.

## 1. Principles
1. **Numbers are the heroes.** Money, clicks and fit are set large, in tabular type, with their basis shown ("estimated from last 10 posts").
2. **Paper, not glass.** Flat warm surfaces separated by hairline rules. No blur, no gradients, no floating cards.
3. **One accent, earned.** Vermilion means *act* or *live*. Highlighter yellow means *selected/important*. Everything else is ink on paper.
4. **Show the work.** Every score has reasons, every projection a basis, every Receipt a verification note.
5. **Every state is designed.** Empty, loading (skeleton), error, success, disabled, offline. No raw errors, no dead ends.
6. **Vocabulary is the interface.** Brief, Lineup, Wire, Receipt, Tray, Offer, Deal — used verbatim.

## 2. The anti-list (never — this is how we stay unlike Naano and unlike every AI-generated SaaS page)
Sky/cloud imagery · frosted glass, blur, glow · smooth or decorative gradients (hard-stop hatching for skeletons is fine) · blue as an accent · Inter / Inter Tight / Geist / Poppins · black pill buttons ·
photo-card grids · logo walls · big stat-tile rows (number-in-a-card) · testimonial-with-video blocks · floating AI prompt bars · purple-on-white "AI" look ·
stock or AI-generated illustration · emoji as UI · left icon rail · drop shadows heavier than a hairline · rounded-2xl everywhere · carousel-of-LinkedIn-posts.
**Squint test** (Phase 2 and 8): put a Byline screenshot beside a Naano one; a stranger must never confuse them at a glance (palette, type, layout, avatars, interaction model).

## 3. Tokens (CSS variables in `src/styles/tokens.css` — the only place hex values live)
| Token | Value | Use | Contrast (measured) |
|---|---|---|---|
| `--paper` | `#F5F1EA` | page background | — |
| `--paper-2` | `#FBF8F3` | raised areas (drawer, tray) | — |
| `--ink` | `#15130F` | text, rules, primary outline | 16.5:1 on paper |
| `--muted` | `#6B655B` | secondary text, captions | 5.1:1 ✅ |
| `--line` | `#E3DCCF` | decorative hairlines | 1.2:1 (decoration only) |
| `--line-strong` | `#8A8377` | control borders (inputs, checkboxes) | 3.3:1 ✅ (non-text 3:1) |
| `--vermilion` | `#FF4B1F` | **fills only**: primary button, live dot, hold fill | **ink on it 5.6:1 ✅**; white on it 3.3:1 ❌ (never) |
| `--vermilion-ink` | `#C2300A` | small vermilion **text/links/icons** on paper | 5.0:1 ✅ |
| `--highlight` | `#FFD84D` | selection mark, slot underline, emphasis | ink on it 13.4:1 |
| `--green` | `#0E4B3A` | positive money (paid, cost per click), verified | 8.9:1 ✅ |
Mistake caught during Phase 1: the concept mockup used white text on vermilion; that fails AA. **Primary button = vermilion fill + ink text.**

**Type** (self-hosted via `next/font/google`)
- **Display / numerals:** *Instrument Serif* — headlines, big numbers, receipt titles. Regular + italic.
- **UI:** *Schibsted Grotesk* — a news-origin grotesque, chosen because it is not Inter-like. Weights 400/500/700 max.
- **Data / datelines / money:** *JetBrains Mono* with `font-variant-numeric: tabular-nums`.
- Fluid scale: `display-xl clamp(2.75rem, 1.6rem + 5vw, 5.5rem)` · `display clamp(2rem, 1.4rem + 2.6vw, 3.25rem)` · `title 1.5rem` · `body 1rem/1.5` · `small 0.875rem` · `caption 0.75rem mono`. Body ≥ 16 px on inputs (no iOS zoom).
- Sentence case everywhere. Datelines in mono with `letter-spacing:.04em`, sentence case (not all-caps).

**Space & shape:** 4 px base scale (4 8 12 16 24 32 48 72 120). Radii: `0` for rules/cards/table rows, `2px` inputs/buttons, full-round only for the live dot and avatars. **No shadows**; depth = hairline + `--paper-2`.
**Paper grain:** a tiny tiled noise (≈3 % opacity, data-URI, `pointer-events:none`, off for `prefers-contrast: more`).
**Focus:** 2 px `--ink` outline with 2 px paper gap + vermilion inner ring on interactive controls; never removed.

## 4. Layout and shell
- **Grid:** 12 columns, max 1200 (app up to 1440), gutters 16 / 24. Content sits on hairline rules like a broadsheet: column rules, section rules, not boxes.
- **Shell (desktop):** **masthead** — wordmark left; nav (Desk · Campaigns · Wire · Wallet — creators: Offers · Deals · Earnings · Kit) center; **wallet · escrow** figures + bell right — with the **Wire ticker** as a 28 px strip beneath it. No left rail (Naano's app uses one).
- **Shell (phone):** compact masthead + ticker collapses to the latest event; **bottom tab bar** (safe-area aware) with the same destinations.
- **Wordmark:** "Byline" in Instrument Serif italic with a 2 px vermilion rule under it — the *line* is literally a line. Favicon: the italic **B** with the rule.

## 5. Signature components (each ships with all states in `/styleguide`)
| Component | Notes |
|---|---|
| `BriefSentence` | Serif sentence with inline slots; slot = highlighter underline, opens a popover (multi-select / text / €). Keyboard: Tab between slots, Enter opens, Esc closes. Fully usable on a phone as a stacked form fallback. |
| `RosterRow` | Halftone · name (serif) · headline · `FitBar` + why chips (mono) · €/post · projection · add button. Selected = highlighter wash. Container query: ≥560 px row, <560 px stacked card. |
| `FitBar` | 4 px ink bar on hairline track, "92 % fit" mono; tooltip/expander lists factor contributions. |
| `Halftone` | Procedural SVG portrait from a seed (12×12 dot grid: head ellipse + shoulders, radius falls off from centre, per-dot jitter from the hash). Duotone ink on `--line`. Deterministic, no photos. |
| `Tray` | Sticky right panel ≥1024; drawer 768–1023; **bottom sheet** on phones with a peek bar ("3 · €4,150 · ~2.1k clicks"). Budget bar turns vermilion-ink when over. |
| `HoldButton` | Vermilion outline → fills left-to-right over 900 ms; ink text; success state "In escrow · €X". Keyboard/reduced-motion → confirm dialog. |
| `Ticker` / `WireItem` | Mono, single line, newest slides in; polite live region; pauses on hover/focus; static list when reduced motion. |
| `Receipt` | Paper strip with perforated top/bottom (dashed 2 px ink), serif title, mono ledger lines, green cost-per-click, "verified by redirect" footer; "prints" in with a 400 ms clip reveal. Printable CSS. |
| `RunOfShow` | Date axis with hairline gridlines; booking blocks positioned by dates with `Stamp` status; live blocks carry a sparkline of clicks. Phone: agenda list. |
| `Stamp` | Square status marker in mono (invited, accepted, drafted, changes, approved, live, paid, cancelled); `live` gets the vermilion dot pulse. |
| `Sparkline`, `CountUp` | Hand-rolled SVG; count-up 600 ms ease-out; static under reduced motion. |
| `Button` | primary (vermilion + ink), secondary (ink outline), ghost (underline on hover), destructive (ink outline + vermilion-ink text). 44 px min height; pending state = mono "…" + disabled + `aria-busy`. |
| `Field`, `Select`, `Popover`, `Dialog`, `Drawer`, `Toast`, `Tabs`, `Table` | Radix primitives fully restyled; toast bottom-left mono; tables use hairline rules and mono figures right-aligned. |
| `Skeleton` | Hatched paper lines (diagonal hairlines), not grey shimmer bars. |
| `EmptyState` | Serif headline naming the space + one-line body + verb CTA. Never "Nothing here yet". |

## 6. Responsive matrix
| Surface | ≥1280 | 768–1279 | <768 |
|---|---|---|---|
| Desk | Brief bar · lineup · 360 px tray | Tray = slide-in drawer | Tray = bottom sheet; rows stacked; sentence as stacked form |
| Nav | Masthead + ticker | Masthead, icons + labels | Compact masthead + **bottom tabs** |
| Creator | Two-pane inbox/detail | Single pane + detail | **Mobile-first** cards, big Accept/Decline, autosaving draft |
| Run-of-show | Full calendar | Week view | Agenda list |
| Receipt / kit | Centered 720 px | Same | Full-bleed, single column |
Rules: mobile-first CSS · container queries for components · `dvh` and safe-area insets · 44 px targets · no hover-only affordances · fluid type · test at 320/375/768/1024/1280/1536/1920 in the built-in browser and real iOS Safari via the simulator.

## 7. Motion
Durations 120 / 180 / 400 ms; easings `cubic-bezier(.2,.7,.2,1)` (out) and linear for progress. Choreography: row highlight sweep on add (180) · tray total/projection **count-up** (600) · hold fill (900 linear) · Wire item slide-in (180) · Receipt print reveal (400) · route change = none (instant). All disabled under `prefers-reduced-motion` (state changes still happen, instantly).

## 8. Voice and copy
Plain, exact, editorial. Datelines as labels ("Brief № 0042 · filed 26 Sep"). Verbs on buttons ("Add to lineup", "Hold to commit", "Release payout"). Money always `€1,400` in mono. No "seamless / unlock / AI-powered / supercharge". Errors say what happened and what to do ("Your wallet is €600 short. Add test funds to place this hold."). All copy is original; no Naano phrases.

## 9. Accessibility
AA everywhere (see measured contrast above). Keyboard-complete. Visible focus. Live regions polite for the Wire. Hold-to-commit has a non-hold path. Colour never the only signal (Stamp text + icon shapes). Reduced-motion and high-contrast respected. Form errors inline + summarised; labels always visible.

## 10. Review loop (a screen is not "done" until)
Screenshot at 375 / 768 / 1280 → checked against §1–§9 and the "not clumsy" bar (one spacing scale, no layout shift, skeletons, empty states, focus rings, 44 px targets) → contrast + keyboard pass → squint test on landing and Desk.

## 11. Moodboard (in words, not screenshots)
Newsroom wire copy and datelines · printed receipts and boarding passes · stock-ticker tape · field notebooks · risograph halftones · timetable boards. Nothing from a competitor's product.

## 12. Phase 2 deliverables
`tokens.css`, fonts, `Halftone` generator, the components above with states, masthead/ticker/tab-bar shell, `/styleguide` verified at four widths and passing the squint test.

## 13. Phase 2 outcome (2026-09-26) — what was built, and where reality overrode this brief
**Built:** tokens + constrained Tailwind theme, three fonts, the procedural halftone generator (unit-tested), 15 primitives and signature components, the masthead + Wire ticker + bottom-tab shell, and `/styleguide` with every component in its real states (see D-042 … D-050).
**Measured:** no horizontal overflow at 320/375/768/1024/1280/1536/1920; axe-core 0 violations at 1280 and 375; hold-to-commit behaviour verified through real pointer events (early release cancels, full hold commits, Enter opens the confirm dialog); sheet focus and duplicate-ID fixes verified.
**Deviations (the brief is otherwise unchanged; later sections should be read with these):**
- No 768–1023 tray drawer: below 1024 it is a sticky peek bar + bottom sheet (D-045).
- `BriefSentence` has no stacked-form fallback; popover slots work at every width (D-046).
- Focus ring is a plain 2 px ink outline; HoldButton border is ink; over-budget rows are not dimmed (D-048).
- Hard-stop hatching for skeletons is allowed under "no gradients".
**Squint test (Phase 2, honest):** Naano = pale-blue cloud sky, frosted glass, Inter-like sans, black pills, photo cards, left icon rail, floating AI bar. Byline = warm paper, serif display + mono figures, vermilion-on-ink actions, hairline rules, generated halftone portraits, masthead + ticker, sentence-as-search. Palette, type, layout, avatars and interaction model all differ; a stranger would not confuse them. **Caveat:** this covers the design system, not yet a real product screen; repeat on the landing page (Phase 7) and the Desk (Phase 4).

## 14. Phase 7 outcome — the squint test on real product screens (2026-09-26)
**Screens compared:** Byline's landing page and desk against Naano's home page and marketplace preview.
| | Naano | Byline |
|---|---|---|
| Ground | pale-blue cloud sky, frosted-glass cards | warm paper, hairline rules, no glass |
| Type | bold tight Inter-style sans | serif display with an italic turn, mono figures |
| Hero | headline + CTA over sky, logo wall | headline + **the working product** (sentence → ranked lineup) |
| Creators | photo cards with a matching bar | roster rows with generated halftone portraits and reasoned fit |
| Proof | video testimonial, stat tiles, post carousel | a **real Receipt** with what it can and cannot vouch for |
| Pricing | plan cards | a three-line definition list, and "free while we test" |
| Interaction | floating AI prompt bar | the brief sentence is the search |
**Result:** a stranger would not confuse them at a glance, at a squint, or by structure. Shared conventions (an accordion FAQ, a pricing section, a primary/secondary CTA pair) are universal patterns, executed differently. The earlier caveat (D-… "design system only") is now closed for the landing page and the desk.

## 15. Phase 8 outcome (harden)
- **Touch first.** Controls are 44 px tall by default; the compact 36 px size exists only for `pointer-fine` devices. A width never decides it (an iPad at 768 or 1024 is touch). Tested at 320 / 375 / 768 / 1024 (touch) and 1280 / 1536 / 1920 (mouse) on every screen.
- **The primary action is never below the fold.** On phones the tray sheet pins the hold button to its bottom edge, inset by the safe area.
- **Keyboard is a first-class path.** One skip link on every page; a visible 2 px ink outline on every stop; dialogs and sheets return focus to what opened them; the hold is fully operable with Enter (and, under reduced motion, with a click) and opens the same confirmation.
- **Failing gracefully is designed.** Skeletons match the real grid; every error boundary has a retry and a plain sentence; a database outage never shows a raw 500 (the tracked link answers 503 with Retry-After).
- **Measured, not asserted.** axe (WCAG 2.2 AA + best practice) clean on 18 screens at 320 / 768 / 1280; Lighthouse mobile 91–96 performance and 100 accessibility, best practices, SEO (Receipt is `noindex` by design). Real iOS Safari (iPhone SE, iOS 18.3) renders the landing page, creator kit, Receipt and developers page as designed.
