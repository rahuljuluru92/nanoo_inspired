#!/usr/bin/env python3
"""8x agent capture: append every prompt and final response to .agent-logs/.

Wired in .claude/settings.json:
  SessionStart     -> `capture.py`   (stores the model if the client sends one; the desktop app does not)
  UserPromptSubmit -> `capture.py`   (logs the prompt, verbatim)
  Stop             -> `capture.py`   (logs the final response of the turn)

Only the prompt and the final response are written. No thinking, no tool calls.
Never blocks the agent: always exits 0, and any failure goes to
.agent-logs/capture-errors.log so a broken hook is visible, not silent.

Manual backfill (for turns that ran before the hook existed):
  capture.py --backfill <transcript.jsonl>
"""
import glob
import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone

ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
LOG_DIR = os.path.join(ROOT, ".agent-logs")
ERR_LOG = os.path.join(LOG_DIR, "capture-errors.log")
TOOL = "claude-code"

ENTRY_RE = re.compile(
    r"^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) session=(\w+)\]\ntimestamp: (\S+)\nmodel: (.*)$",
    re.M,
)


def utc_now():
    n = datetime.now(timezone.utc)
    return n.strftime("%Y-%m-%dT%H:%M:%S.") + "%03dZ" % (n.microsecond // 1000)


def author():
    for cmd in ("git config github.user", "git config user.email"):
        try:
            out = os.popen(cmd + " 2>/dev/null").read().strip()
        except Exception:
            out = ""
        if out:
            return out.split("@")[0]
    return "unknown"


def log_error(msg):
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        with open(ERR_LOG, "a") as f:
            f.write("%s %s\n" % (utc_now(), msg))
    except Exception:
        pass


# ---------- transcript helpers ----------

def read_transcript(path):
    rows = []
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except Exception:
                    pass
    except Exception:
        pass
    return rows


def is_real_user_prompt(row):
    if row.get("type") != "user" or row.get("isSidechain") or row.get("isMeta"):
        return False
    c = (row.get("message") or {}).get("content")
    if isinstance(c, str):
        return True
    if isinstance(c, list):
        return any(b.get("type") == "text" for b in c) and not any(
            b.get("type") == "tool_result" for b in c
        )
    return False


def user_text(row):
    c = row["message"]["content"]
    if isinstance(c, str):
        return c
    return "".join(b.get("text", "") for b in c if b.get("type") == "text")


def final_segment(rows):
    """Text after the last tool call of the most recent turn -> (text, model, ts)."""
    parts, model, ts = [], None, None
    for row in reversed(rows):
        t = row.get("type")
        if t == "assistant" and not row.get("isSidechain"):
            blocks = (row.get("message") or {}).get("content") or []
            txt = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            if txt.strip():
                parts.append(txt)
                model = model or (row.get("message") or {}).get("model")
                ts = ts or row.get("timestamp")
            elif any(b.get("type") == "tool_use" for b in blocks) and parts:
                break
        elif t == "user" and not row.get("isSidechain"):
            break
    return "\n\n".join(reversed(parts)), model, ts


def last_model(rows):
    for row in reversed(rows):
        if row.get("type") == "assistant":
            m = (row.get("message") or {}).get("model")
            if m and not m.startswith("<"):
                return m
    return None


def current_model(rows):
    """Newest model signal in the transcript: an assistant message's model, or the `model`
    attachment row the desktop app writes with a session's first prompt (that row is the only
    place the real id exists before the first answer)."""
    for row in reversed(rows):
        if row.get("type") == "assistant":
            m = (row.get("message") or {}).get("model")
            if m and not m.startswith("<"):
                return m
        elif row.get("type") == "attachment":
            att = row.get("attachment") or {}
            if att.get("type") == "model":
                m = (att.get("identity") or {}).get("modelId")
                if m:
                    return m
    return None


def settings_model():
    for p in (
        os.path.join(ROOT, ".claude", "settings.local.json"),
        os.path.join(ROOT, ".claude", "settings.json"),
        os.path.expanduser("~/.claude/settings.json"),
    ):
        try:
            m = json.load(open(p)).get("model")
            if m:
                return m
        except Exception:
            pass
    return None


# ---------- log file ----------

def find_log(session_id):
    hits = sorted(glob.glob(os.path.join(LOG_DIR, "*_%s.md" % session_id)))
    return hits[0] if hits else None


def new_log_path(session_id, ts_iso):
    dt = datetime.strptime(ts_iso[:19], "%Y-%m-%dT%H:%M:%S")
    name = "%s_%s.md" % (dt.strftime("%Y-%m-%d_%H-%M-%S"), session_id)
    return os.path.join(LOG_DIR, name)


def split_body(text):
    i = text.find("[LOG_ENTRY type=")
    return text[i:] if i >= 0 else ""


def build_header(session_id, body, model, extra=None):
    entries = ENTRY_RE.findall(body)
    prompts = [e for e in entries if e[0] == "PROMPT"]
    first = prompts[0][3] if prompts else ""
    last = prompts[-1][3] if prompts else ""
    date = first[:10] if first else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sid8 = session_id[:8]
    proj = os.path.basename(ROOT.rstrip("/"))
    au = author()
    lines = [
        "---",
        "session_id: %s" % session_id,
        "date: %s" % date,
        "author: %s" % au,
        "model: %s" % model,
        "tool: %s" % TOOL,
        "project: %s" % proj,
        "total_exchanges: %d" % len(prompts),
        "first_prompt_time: %s" % first,
        "last_prompt_time: %s" % last,
    ]
    for k, v in (extra or {}).items():
        lines.append("%s: %s" % (k, v))
    lines += [
        "---",
        "",
        "# Session Log - %s" % date,
        "",
        "Session: `%s` | Project: `%s` | Author: `%s`" % (sid8, proj, au),
        "",
        "---",
        "",
        "",
    ]
    return "\n".join(lines)


def existing_extra(text):
    extra = {}
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(": ")
            if k in ("backfilled_turns", "backfill_note"):
                extra[k] = v
    return extra


def append_entry(session_id, kind, text, ts, model, extra=None):
    os.makedirs(LOG_DIR, exist_ok=True)
    path = find_log(session_id)
    body, prev_extra = "", {}
    if path:
        old = open(path).read()
        body = split_body(old)
        prev_extra = existing_extra(old)
    else:
        path = new_log_path(session_id, ts)

    entries = ENTRY_RE.findall(body)
    n_prompts = sum(1 for e in entries if e[0] == "PROMPT")
    if kind == "PROMPT":
        num = n_prompts + 1
    else:
        num = n_prompts
        if any(e[0] == "RESPONSE" and int(e[1]) == num for e in entries):
            return path  # already logged this turn's response
        if num == 0:
            return path  # response without a logged prompt: nothing to attach to

    sid8 = session_id[:8]
    body += "[LOG_ENTRY type=%s num=%d session=%s]\ntimestamp: %s\nmodel: %s\n\n%s\n\n\n" % (
        kind, num, sid8, ts, model, text.rstrip("\n") if kind == "RESPONSE" else text,
    )
    prev_extra.update(extra or {})
    with open(path, "w") as f:
        f.write(build_header(session_id, body, model, prev_extra) + body)
    return path


# ---------- entry points ----------

CACHE_DIR = os.path.expanduser("~/.cache/8x-capture")  # outside the repo: per-session scratch, never committed


def on_session_start(d):
    """The prompt payload has no model, so remember what SessionStart tells us."""
    sid = d.get("session_id") or "unknown"
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(os.path.join(CACHE_DIR, sid + ".json"), "w") as f:
        json.dump({"model": d.get("model"), "source": d.get("source"), "payload_keys": sorted(d)}, f)


def session_model(sid):
    try:
        return json.load(open(os.path.join(CACHE_DIR, sid + ".json"))).get("model")
    except Exception:
        return None


def on_prompt(d):
    sid = d.get("session_id") or "unknown"
    tp = d.get("transcript_path") or ""
    # newest signal wins: payload (never has one on desktop), then the newest model signal in the
    # transcript (tracks a mid-session switch), then what SessionStart reported (also nothing on
    # desktop, kept in case another client sends it), then the settings alias.
    model = d.get("model")
    for attempt in range(4):  # on a fresh session the transcript can lag the hook by a moment
        model = model or current_model(read_transcript(tp))
        if model or not tp:
            break
        time.sleep(0.25)
    model = model or session_model(sid) or settings_model() or "unknown"
    append_entry(sid, "PROMPT", d.get("prompt", ""), utc_now(), model)


def on_stop(d):
    sid = d.get("session_id") or "unknown"
    tp = d.get("transcript_path") or ""
    text, model, ts = (d.get("last_assistant_message") or ""), None, None
    from_hook = bool(text.strip())
    rows = []
    for attempt in range(6):  # the transcript can lag the hook by a moment
        rows = read_transcript(tp)
        seg, model, seg_ts = final_segment(rows)
        if not from_hook:
            text, ts = seg, seg_ts
        if text.strip():
            break
        time.sleep(0.4)
    model = model or last_model(rows) or settings_model() or "unknown"
    if not text.strip():
        log_error("stop: no final response text found for session %s" % sid)
        return
    append_entry(sid, "RESPONSE", text, ts or utc_now(), model)


def backfill(transcript_path):
    rows = read_transcript(transcript_path)
    sid = next((r.get("sessionId") for r in rows if r.get("sessionId")), None)
    if not sid:
        sys.exit("no sessionId in transcript")
    turns, cur = [], None
    for r in rows:
        if is_real_user_prompt(r):
            cur = {"prompt": user_text(r), "ts": r["timestamp"], "rows": []}
            turns.append(cur)
        elif cur is not None:
            cur["rows"].append(r)
    have, answered = 0, set()
    p = find_log(sid)
    if p:
        ents = ENTRY_RE.findall(open(p).read())
        have = sum(1 for e in ents if e[0] == "PROMPT")
        answered = {int(e[1]) for e in ents if e[0] == "RESPONSE"}
    done = []
    for i, t in enumerate(turns, 1):
        if i <= have:
            if i == have and i not in answered:  # latest logged prompt still lacks its response
                seg, model, rts = final_segment(t["rows"])
                if seg.strip():
                    append_entry(sid, "RESPONSE", seg, rts or t["ts"], model or "unknown")
                    done.append("%d(response)" % i)
            continue
        seg, model, rts = final_segment(t["rows"])
        model = model or last_model(rows) or "unknown"
        extra = {"backfilled_turns": "%s" % (",".join(done + [str(i)]))}
        extra["backfill_note"] = (
            "these turns ran before the capture hook was installed; text copied verbatim from the session transcript"
        )
        append_entry(sid, "PROMPT", t["prompt"], t["ts"], model, extra)
        if seg.strip():
            append_entry(sid, "RESPONSE", seg, rts or t["ts"], model)
        done.append(str(i))
    print("backfilled turns: %s" % ",".join(done) if done else "nothing to backfill")


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "--backfill":
        backfill(sys.argv[2])
        return
    try:
        d = json.load(sys.stdin)
    except Exception:
        log_error("could not parse hook stdin")
        return
    ev = d.get("hook_event_name")
    try:
        if ev == "SessionStart":
            on_session_start(d)
        elif ev == "UserPromptSubmit":
            on_prompt(d)
        elif ev == "Stop":
            on_stop(d)
    except Exception:
        log_error("%s failed: %s" % (ev, traceback.format_exc().replace("\n", " | ")))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        log_error("fatal: " + traceback.format_exc().replace("\n", " | "))
    sys.exit(0)
