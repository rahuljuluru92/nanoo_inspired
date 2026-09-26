// Pre-submission gate: everything a reviewer will look at, checked in one command.   npm run submission:check
// FAIL = fix before submitting. warn = worth a look. Nothing here changes any file.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
let fails = 0;
const line = (tag: string, msg: string) => console.log(`${tag.padEnd(6)} ${msg}`);
const ok = (m: string) => line("ok", m);
const warn = (m: string) => line("warn", m);
const fail = (m: string) => {
  fails++;
  line("FAIL", m);
};
const git = (...args: string[]) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).replace(/\s+$/, "");
  } catch {
    return "";
  }
};

// 1. links and placeholders in the README
const readme = readFileSync(join(root, "README.md"), "utf8");
const links = { live: /\*\*Live\*\*\s*\|\s*(\S+)/, walkthrough: /\*\*Walkthrough[^|]*\|\s*(\S+)/, intro: /\*\*Intro[^|]*\|\s*(\S+)/ };
const found: Record<string, string> = {};
for (const [name, re] of Object.entries(links)) {
  const v = readme.match(re)?.[1] ?? "";
  found[name] = v;
  if (!/^https?:\/\//.test(v)) fail(`README ${name} link is still a placeholder (${v || "missing"})`);
  else ok(`README ${name} link: ${v}`);
}

// 2. the live site answers, from the outside
const live = found.live?.replace(/\/+$/, "");
if (live && /^https?:\/\//.test(live)) {
  try {
    const h = await fetch(`${live}/api/health`, { signal: AbortSignal.timeout(15_000) });
    const j = (await h.json()) as { ok?: boolean; db?: boolean; counts?: { creators?: number } };
    if (h.ok && j.ok && j.db) ok(`live /api/health: database connected, ${j.counts?.creators ?? "?"} creators`);
    else fail(`live /api/health answered ${h.status}: ${JSON.stringify(j).slice(0, 120)}`);
    const home = await fetch(live, { signal: AbortSignal.timeout(15_000), redirect: "manual" });
    if (home.status === 200) ok("live landing page: 200 for a signed-out visitor");
    else fail(`live landing page answered ${home.status} (must be open to signed-out visitors)`);
    const robots = await (await fetch(`${live}/robots.txt`, { signal: AbortSignal.timeout(15_000) })).text();
    if (/localhost/.test(robots)) warn("robots.txt mentions localhost: set NEXT_PUBLIC_SITE_URL or redeploy");
    else ok("robots.txt points at the live host");
  } catch (e) {
    fail(`could not reach ${live}: ${(e as Error).message}`);
  }
}

// 3. the repo is public and everything is pushed
const remote = git("remote", "get-url", "origin");
const slug = remote.match(/github\.com[:/]([^/]+\/[^/.]+)/)?.[1];
if (!slug) fail("no GitHub remote named origin");
else {
  try {
    const r = await fetch(`https://api.github.com/repos/${slug}`, { headers: { "user-agent": "byline-submission-check" }, signal: AbortSignal.timeout(15_000) });
    if (r.status === 200) ok(`github.com/${slug} is public`);
    else fail(`github.com/${slug} answered ${r.status}: the repository must be public (a private repo looks like 404 to strangers)`);
  } catch (e) {
    warn(`could not query GitHub: ${(e as Error).message}`);
  }
}
const upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
if (!upstream) fail("the current branch has no upstream: `git push -u origin main`");
else {
  const ahead = Number(git("rev-list", "--count", `${upstream}..HEAD`) || "0");
  const behind = Number(git("rev-list", "--count", `HEAD..${upstream}`) || "0");
  if (ahead) fail(`${ahead} commit(s) not pushed yet`);
  else if (behind) warn(`${behind} commit(s) on ${upstream} that this checkout does not have`);
  else ok(`everything is pushed to ${upstream}`);
}
const dirty = git("status", "--porcelain");
if (dirty) fail(`uncommitted changes (final logs included?):\n${dirty.split("\n").slice(0, 8).map((l) => "         " + l).join("\n")}`);
else ok("working tree is clean");

// 4. the agent logs
const logsDir = join(root, ".agent-logs");
if (!existsSync(logsDir)) fail(".agent-logs/ is missing");
else {
  const files = readdirSync(logsDir).filter((f) => f.endsWith(".md"));
  const bytes = files.reduce((n, f) => n + statSync(join(logsDir, f)).size, 0);
  if (!files.length) fail(".agent-logs/ has no logs");
  else ok(`.agent-logs: ${files.length} session file(s), ${(bytes / 1024).toFixed(0)} KB`);
  const err = join(logsDir, "capture-errors.log");
  if (existsSync(err) && statSync(err).size > 0) warn("capture-errors.log is not empty: read it and mention it in CAPTURE-TEST.md");
  const ignored = git("check-ignore", ".agent-logs/x.md");
  if (ignored) fail(".agent-logs is gitignored");
}
for (const f of ["CAPTURE-TEST.md", "DECISIONS.md", "README.md", "DEPLOY.md", ".github/workflows/ci.yml", ".env.example"]) {
  if (!existsSync(join(root, f))) fail(`missing ${f}`);
}

// 5. no secrets in what is tracked (the throwaway CI service password is expected)
const tracked = git("ls-files").split("\n").filter(Boolean);
const envFiles = tracked.filter((f) => /(^|\/)\.env/.test(f) && f !== ".env.example");
if (envFiles.length) fail(`env file(s) are tracked: ${envFiles.join(", ")}`);
const patterns: [string, RegExp][] = [
  ["a database URL with a password", /postgres(?:ql)?:\/\/[^\s"'@:/]+:(?!postgres@)[^\s"'@]+@[^\s"']+/],
  ["an API key", /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b/],
  ["a JWT", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];
let leaks = 0;
for (const f of tracked) {
  if (/\.(png|jpg|svg|woff2?|ico)$/.test(f) || f === "package-lock.json") continue;
  let text = "";
  try {
    text = readFileSync(join(root, f), "utf8");
  } catch {
    continue;
  }
  for (const [what, re] of patterns) {
    const m = text.match(re);
    if (m) {
      leaks++;
      fail(`${f} contains ${what}: ${m[0].slice(0, 12)}…`);
    }
  }
}
if (!leaks) ok(`no secrets found in ${tracked.length} tracked files`);

console.log(fails ? `\n${fails} problem(s) to fix before submitting` : "\nready to submit");
process.exit(fails ? 1 : 0);
