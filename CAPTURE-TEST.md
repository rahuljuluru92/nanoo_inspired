# Capture test

**Status: capture works (prompt + response, canary 1); one known defect, fixed but not yet confirmed live.** Canary 1 (session A,
2026-09-26T05:45Z) captured prompt **and** response in a fresh desktop session. Canary 2 (session B, 05:48Z) captured the prompt but
showed the first PROMPT of a fresh session logs `model: sonnet` instead of the real id; fixed 05:52Z, verified by replay only.
**Canary 3** (a third fresh session) is the live confirmation.

## Setup (step 1)

- **Tool:** Claude Code, inside the Claude desktop app (Code tab). Version 2.1.281 (app) / 2.1.226 (standalone CLI).
- **Model:** `claude-sonnet-5`. One model plans and executes; there is no separate planner. A model
  switch mid-build shows up in the `model:` line of each log entry.
- **Has an automatic hook mechanism:** yes — `SessionStart`, `UserPromptSubmit` and `Stop` hooks in `.claude/settings.json`.

## Mechanism (step 2)

- **Config file changed:** `.claude/settings.json` — registers `.claude/hooks/capture.py` on
  `UserPromptSubmit` (logs the prompt verbatim) and `Stop` (logs the final response of the turn); `SessionStart` was added at 05:47Z (see "Tried first" #4).
- **Script:** `.claude/hooks/capture.py` (stdlib only, always exits 0). Also registered on `SessionStart`, which
  stores the model to `~/.cache/8x-capture/` if a client sends one (the desktop app does not, see "Tried first" #5). The prompt
  payload carries no model either, so the prompt handler reads it from the session transcript.
  - Prompt: taken verbatim from the hook payload's `prompt` field.
  - Response: the hook payload's `last_assistant_message`, falling back to the session transcript
    (`transcript_path`), keeping only the text after the turn's last tool call. Thinking and tool
    calls are never written.
  - One file per session: `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`, 8x format,
    front matter (`total_exchanges`, `first/last_prompt_time`) regenerated on every write.
  - Failures never block the agent; they go to `.agent-logs/capture-errors.log`.
- `.agent-logs/` is not in `.gitignore` (the file says so in a comment).

## Log file the canaries landed in

- Canary 1: `.agent-logs/2026-09-26_05-45-24_7cca7f4e-e401-4c92-9000-dfac4d55f8e0.md` — 1 PROMPT + 1 RESPONSE, no `capture-errors.log`.
- Canary 2: `.agent-logs/2026-09-26_05-48-39_7d8eec6d-1541-4ffd-a4b4-67157fae031c.md` — PROMPT captured (`model: sonnet`, the defect), no `capture-errors.log`.

## Canary 1 (session A) — PASSED

Session `7cca7f4e-e401-4c92-9000-dfac4d55f8e0`, a brand-new desktop session started after the hook was installed.
Entries pasted raw from `.agent-logs/2026-09-26_05-45-24_7cca7f4e-e401-4c92-9000-dfac4d55f8e0.md`:

````
[LOG_ENTRY type=PROMPT num=1 session=7cca7f4e]
timestamp: 2026-09-26T05:45:24.049Z
model: sonnet

CAPTURE TEST — 8x assignment, Rahul


[LOG_ENTRY type=RESPONSE num=1 session=7cca7f4e]
timestamp: 2026-09-26T05:45:41.254Z
model: claude-sonnet-5

The prompt was captured, but I can't confirm the response yet, and the model line looks wrong.

- **Prompt:** it landed verbatim in `.agent-logs/2026-09-26_05-45-24_7cca7f4e-….md` as `[LOG_ENTRY type=PROMPT num=1]`, with the right session id and timestamp.
- **Error log:** `capture-errors.log` doesn't exist, so the hook logged no errors.
- **Model line:** it says `model: sonnet`, not the real id `claude-sonnet-5`. This is the same fallback from `~/.claude/settings.json` that `CAPTURE-TEST.md` describes for the headless canary. The `UserPromptSubmit` payload has no model, and there is no assistant message to read it from when the prompt is logged. The `Stop` hook may correct it on the response entry, or the hook may need a fix. Check the response entry once this turn ends.
- **Response:** the `Stop` hook fires after I finish this message, so my reply isn't in the file yet.

Once this turn ends, open that log file. If a `[LOG_ENTRY type=RESPONSE num=1]` is there with the real model id, this canary passes.

I haven't touched `CAPTURE-TEST.md` (its Canary sections are still `_pending_`) or committed anything. Your notes say to fill it in after both canary sessions, so I'll wait for the second one.
````

Note: the PROMPT entry says `model: sonnet` while the RESPONSE says `claude-sonnet-5` (see "Tried first" #4). The entry is left
unedited; the fix below was made afterwards.

## Canary 2 (session B) — prompt captured; model check FAILED, fixed afterwards

Session `7d8eec6d-1541-4ffd-a4b4-67157fae031c`, a second brand-new desktop session. The prompt was captured, and no
`capture-errors.log` was created. The purpose of this canary was to confirm the `SessionStart` model fix, and it did not work:
the PROMPT again logged `model: sonnet`. PROMPT entry, pasted raw from `.agent-logs/2026-09-26_05-48-39_7d8eec6d-….md`:

````
[LOG_ENTRY type=PROMPT num=1 session=7d8eec6d]
timestamp: 2026-09-26T05:48:39.229Z
model: sonnet

CAPTURE TEST — 8x assignment, Rahul
````

What the session cache `~/.cache/8x-capture/7d8eec6d-….json` recorded: `"model": null`, `"source": "startup"`, payload keys
`cwd, hook_event_name, scratchpad_dir, session_id, source, transcript_path`. **The desktop app's `SessionStart` payload has no
`model` field**, so the fix from D-025 could not work here. The hook did fire; there was just nothing to store. See "Tried first" #5.

This session's RESPONSE entry is written by the `Stop` hook after the turn ends and is not pasted here. The patched hook was only
verified by replay (below), not live: **canary 3** (one more fresh desktop session) is the live check.

## Tried first / did not work

1. **Backfill of turns that ran before the hook existed.** The first two prompts of the setup
   session (the pasted setup message and "start phase 0") were sent before the hook was installed, so
   they are in `.agent-logs/2026-09-26_05-09-43_4d4e227d-….md`, copied verbatim from the session
   transcript by `capture.py --backfill`. The file's front matter says `backfilled_turns: 1,2`.
2. **Headless canary with the standalone `claude -p` CLI.** It is not logged in on this machine (the
   desktop app authenticates separately), so it returned `Not logged in · Please run /login` and no
   response. It did prove the hook loads in a brand-new session: the prompt landed in
   `.agent-logs/2026-09-26_05-20-52_e5676082-….md`. That entry is left in place, unedited; it has
   no matching RESPONSE because there was no response. Its `model: sonnet` is a fallback read from
   `~/.claude/settings.json`, because the hook payload carries no model and there was no assistant
   message yet.
3. **First offline test failed on my side:** zsh `echo` expanded `\n` inside my JSON test payload, so
   the hook logged "could not parse hook stdin" to the error log. That was a test bug, not a hook bug;
   the hook fails visibly rather than silently, which is the behaviour we want.
4. **The first PROMPT of a fresh session logged `model: sonnet`, not the real model id** (visible in canary 1). The
   `UserPromptSubmit` payload has no model field and, on a session's first prompt, the transcript has no assistant message to read
   one from, so the hook fell back to the alias in `~/.claude/settings.json`. Fix (made 2026-09-26T05:47Z, after canary 1): a
   `SessionStart` hook stores the model the session reports; the prompt handler now resolves the model as payload → last assistant
   message in the transcript → SessionStart → settings alias → `unknown`. I did **not** patch the already-logged canary-1 entry
   (logs are never edited). Known limit: right after a mid-session model switch, the *prompt* line can still show the previous model
   for one turn; the RESPONSE line always carries the model that actually answered. Whether the desktop app puts `model` in the
   SessionStart payload is confirmed by canary 2.
5. **Canary 2 showed fix #4 does not work on desktop: the `SessionStart` payload has no `model` field** (keys listed in the Canary 2
   section), and the PROMPT logged `model: sonnet` again. The real model id is in the session transcript, though: the desktop app
   writes a row `{"type":"attachment","attachment":{"type":"model","identity":{"modelId":"claude-sonnet-5",…}}}` together with the
   first user message, before any assistant message exists. Fix (2026-09-26T05:52Z): `current_model()` in `capture.py` scans the
   transcript backwards for whichever is newest, an assistant message's `model` or that attachment row, and the prompt handler retries
   up to 4 × 0.25 s if the transcript lags the hook. Order is now payload → transcript (assistant/attachment) → SessionStart cache →
   settings alias → `unknown`. **Verified by replay only:** I fed the patched hook (in a scratch dir, real logs untouched) this
   session's first-prompt transcript rows only → `model: claude-sonnet-5`; the full transcript → `claude-sonnet-5`; an empty transcript →
   falls back to `unknown` with rc 0 and no error. Not yet confirmed live (canary 3). The canary-2 PROMPT entry stays as logged, unedited.
   One thing the replay cannot show is whether the hook fires before or after the desktop app writes that attachment row; the retry
   loop covers a short lag.
