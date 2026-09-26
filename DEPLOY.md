# Deploying Byline (about 20 minutes)

Two things are needed: a **Postgres 15+** database and a **Vercel** project. The app has no other services. You create the two accounts and hold the secrets; the agent never creates accounts and never sees a connection string (prompts are logged verbatim into this public repo, so **never paste a `DATABASE_URL` into chat**).

The trick that keeps secrets out of the conversation: put the database URL in a file named **`.env.remote`**. It is gitignored (`.env.*`), the `db:remote` and `e2e:live` scripts read it, and the agent can run those scripts without ever reading the file.

## 1. The database (Neon recommended; Supabase works too)

**Neon**
1. neon.tech → sign up → *Create project*. Postgres 16 or 17. Pick the region **closest to where Vercel will run your functions** (for European users, Frankfurt / `eu-central-1`).
2. *Connect* → copy **two** strings: the **direct** one (host has no `-pooler`) and the **pooled** one (host has `-pooler`).

**Supabase** (alternative)
1. supabase.com → *New project* → same region logic.
2. *Connect* → the **direct connection** (or *Session pooler*) for migrations, and the **Transaction pooler** (port 6543) for the app. Use the `postgres` user.

Create **`.env.remote`** in the repo root (this file is never committed):

```
DATABASE_URL=<the DIRECT connection string>
```

Then, in a terminal:

```bash
npm run db:remote -- check      # must end with "this database is ready"
npm run db:remote -- migrate    # applies the 8 migrations (creates the two least-privilege roles once)
npm run db:remote -- seed       # 40 fictional creators, 3 brands, the demo accounts and campaigns
```

If `check` says the role cannot create roles, use the provider's default owner role (`neondb_owner` / `postgres`), not a read-only one.

## 2. Vercel

1. Push the repo (you decide when; nothing has been pushed yet): `git push -u origin main`.
2. vercel.com → *Add New… → Project* → import the GitHub repo. Framework is detected (Next.js). Leave build settings alone.
3. *Environment Variables* (Production **and** Preview):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the **pooled** connection string |
   | `CLICK_HASH_SECRET` | any long random string, e.g. the output of `openssl rand -hex 32` |
   | `NEXT_PUBLIC_SITE_URL` | *optional*: only for a custom domain. On Vercel the production hostname is picked up automatically |

4. *Settings → Functions → Function Region*: the same region as the database (Frankfurt = `fra1`). Latency between app and database is the biggest performance lever.
5. *Deploy*.

## 3. Verify it worked

```bash
curl https://YOUR-APP.vercel.app/api/health
# {"ok":true,"db":true,"counts":{"creators":40,"brands":3,"bookings":8,…},"migrations":8}
```

Then open the site in a **private window** (signed out): the landing page loads, editing the brief re-ranks the lineup, *Enter as the demo brand* lands on the desk.

Run the whole end-to-end suite against the live site. Add the address to `.env.remote`, then run:

```
E2E_BASE_URL=https://YOUR-APP.vercel.app
```

```bash
npm run e2e:install      # once
npm run e2e:live
```

It restores the demo world first, drives the real site with two brand-new users (join → price → brief → hold → accept → draft → changes → approve → live → readers click → payout → Receipt), audits the ledger in the live database, and afterwards **removes everything it created** so the public roster is exactly as seeded. (Three tests that need to spoof a client IP are skipped on a live site: the platform sets the IP.)

Before you record the walkthrough, and any time the demo has been played with:

```bash
npm run db:remote -- reset-demo
```

## 4. If something fails

| Symptom | Cause / fix |
|---|---|
| `check` says `no pg_hba.conf entry` or `SSL required` | The URL must include the provider's SSL setting (Neon: `?sslmode=require`). The tools already enable TLS for non-local hosts |
| `channel_binding` error | Remove `&channel_binding=require` from the URL |
| `permission denied to create role` | Connect as the project's owner role, not a restricted one |
| `/api/health` says `"db":false` on Vercel but `check` passes | The **pooled** URL in Vercel's env is wrong or missing; re-copy it, redeploy |
| Slow pages | Function region ≠ database region (step 2.4) |
| Sitemap/robots show `localhost` | Set `NEXT_PUBLIC_SITE_URL` (custom domain) or redeploy so Vercel's production URL variable is present |
| A migration failed halfway | Each migration is one transaction and is recorded only on success: fix the cause and run `migrate` again |

Rate limits (sign-in, public API) are in memory per server instance, so a busy deployment gets a looser limit than the tests assume; that is a known, documented cut (D-054).

## 5. Keeping secrets out of the repo

- `.env.local` and `.env.remote` are gitignored. Check: `git check-ignore -v .env.remote` prints the rule.
- `git ls-files | grep -i env` should list only `.env.example`.
- `npm run submission:check` (see `SUBMISSION.md`) also scans tracked files for connection strings and keys.
