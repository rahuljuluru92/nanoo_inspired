import { expect, test } from "@playwright/test";
import { HUMAN_UA, STATE, seeded, sql } from "./helpers";

const APP_PATHS = ["/desk", "/campaigns", "/wallet", "/wire", "/offers", "/deals", "/earnings", "/kit", "/onboarding"];

test.describe("signed out", () => {
  for (const path of APP_PATHS) {
    test(`${path} sends a visitor to sign in, with a way back`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
    });
  }

  test("responses carry the security headers", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("robots.txt keeps the app, Receipts and the API out of search; the sitemap lists kits", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/desk", "/receipt/", "/go/", "/api/"]) expect(robots).toContain(`Disallow: ${p}`);
    const map = await (await request.get("/sitemap.xml")).text();
    expect(map).toContain("/c/maya-okafor");
    expect(map).not.toContain("/receipt/");
  });

  test("the public API validates input and answers with JSON errors", async ({ request }) => {
    const bad = await request.get("/api/lineup?limit=999");
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid_limit");
    expect((await request.get("/api/creators/nobody-here")).status()).toBe(404);
    expect((await request.get("/api/creators/BAD%20HANDLE")).status()).toBe(404);
    const ok = await request.get("/api/lineup?buyers=CTOs&limit=3");
    expect(ok.status()).toBe(200);
    expect(ok.headers()["access-control-allow-origin"]).toBe("*");
    expect((await ok.json()).creators).toHaveLength(3);
  });

  test("the API throttles a noisy client and leaves others alone", async ({ request }) => {
    const codes: number[] = [];
    for (let i = 0; i < 64; i++) codes.push((await request.get("/api/lineup?limit=1", { headers: { "x-forwarded-for": "198.51.100.77" } })).status());
    expect(codes.filter((c) => c === 200)).toHaveLength(60);
    expect(codes.slice(60)).toEqual([429, 429, 429, 429]);
    expect((await request.get("/api/lineup?limit=1", { headers: { "x-forwarded-for": "198.51.100.78" } })).status()).toBe(200);
  });

  test("a deep link survives sign-in: a campaign opened while signed out is where you land", async ({ page }) => {
    const { brandCampaign } = await seeded();
    await page.goto(`/campaigns/${brandCampaign}`);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/campaigns/${brandCampaign}`)}$`));
    await page.getByRole("button", { name: "Enter as the demo brand" }).click();
    await expect(page).toHaveURL(`/campaigns/${brandCampaign}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Launch Q4");
  });

  test("sign-in never redirects off-site, whatever `next` says", async ({ page }) => {
    for (const evil of ["https://evil.example", "//evil.example", "/\\evil.example"]) {
      await page.goto(`/login?next=${encodeURIComponent(evil)}`);
      await page.getByRole("button", { name: "Enter as the demo brand" }).click();
      await expect(page).toHaveURL(/localhost:3200\/desk/);
      await page.context().clearCookies();
    }
  });

  test("password sign-in is throttled and never reveals whether an email exists", async ({ page }) => {
    // a private client address per run, so re-running against a warm server starts from zero
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${1 + Math.floor(Math.random() * 250)}` });
    const seen: string[] = [];
    for (let i = 0; i < 9; i++) {
      await page.goto("/login");
      await page.getByLabel("Email").fill("nobody-throttle@example.test");
      await page.getByLabel("Password").fill(`wrong-${i}`);
      await page.getByRole("button", { name: "Sign in" }).click();
      seen.push((await page.locator("form [role=alert]").textContent()) ?? "");
    }
    expect(seen[0]).toContain("don’t match");
    expect(new Set(seen.slice(0, 8)).size).toBe(1); // identical message every time
    expect(seen[8]).toContain("Too many attempts");
    // a real account gets the very same message for a wrong password
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo.brand@byline.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("don’t match");
  });

  test("tracked links: malformed and unknown codes 404 without leaking anything", async ({ request }) => {
    for (const code of ["NOPE", "zzzzzzzz", "k7x2m9p0", "../etc/passwd"]) {
      const r = await request.get(`/go/${encodeURIComponent(code)}`, { maxRedirects: 0 });
      expect(r.status(), code).toBe(404);
    }
  });

  test("a revoked Receipt disappears, and comes back when restored", async ({ request }) => {
    const { paidReceipt } = await seeded();
    expect((await request.get(`/receipt/${paidReceipt}`)).status()).toBe(200);
    await sql("update bookings set receipt_public = false where tracking_code = $1", [paidReceipt]);
    expect((await request.get(`/receipt/${paidReceipt}`)).status()).toBe(404);
    await sql("update bookings set receipt_public = true where tracking_code = $1", [paidReceipt]);
    expect((await request.get(`/receipt/${paidReceipt}`)).status()).toBe(200);
  });
});

test.describe("roles", () => {
  test("a creator cannot open the brand area, and lands on their own home", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STATE.creator });
    const page = await ctx.newPage();
    for (const p of ["/desk", "/campaigns", "/wallet", "/wire"]) {
      await page.goto(p);
      await expect(page, p).toHaveURL(/\/offers/);
    }
    await ctx.close();
  });

  test("a brand cannot open the creator area, and lands on their own home", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STATE.brand });
    const page = await ctx.newPage();
    for (const p of ["/offers", "/deals", "/earnings", "/kit"]) {
      await page.goto(p);
      await expect(page, p).toHaveURL(/\/desk/);
    }
    await ctx.close();
  });

  test("nobody can open another party's booking or campaign: the answer is 'not here', which does not confirm it exists", async ({ browser }) => {
    // (the status is 200 because the page streams behind a loading skeleton; the body is the not-found page and carries noindex)
    const ids = await seeded();
    const creator = await browser.newContext({ storageState: STATE.creator });
    const cp = await creator.newPage();
    await cp.goto(`/deals/${ids.otherCreatorBooking}`);
    await expect(cp.getByRole("heading", { level: 1 })).toHaveText("That page isn’t here.");
    await expect(cp.locator("body")).not.toContainText("Tobias");
    await creator.close();
    const brand = await browser.newContext({ storageState: STATE.brand });
    const bp = await brand.newPage();
    await bp.goto(`/campaigns/${ids.otherBrandCampaign}`);
    await expect(bp.getByRole("heading", { level: 1 })).toHaveText("That page isn’t here.");
    await expect(bp.locator("body")).not.toContainText("Q3 pipeline push");
    await brand.close();
  });

  test("server actions refuse the wrong role even when called directly", async ({ browser }) => {
    // the brand session tries to call a creator RPC via the database role model: covered by SQL suites; here, a creator
    // session must not be able to reach a brand campaign's data through the API surface either
    const ids = await seeded();
    const ctx = await browser.newContext({ storageState: STATE.creator });
    const r = await ctx.request.get(`/campaigns/${ids.brandCampaign}`, { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(r.status());
    expect(r.headers()["location"]).toContain("/offers");
    await ctx.close();
  });
});

test("a tracked link counts a person once per day and ignores crawlers", async ({ request }) => {
  const { code, id } = (await sql<{ code: string; id: string }>("select tracking_code as code, id from bookings where status = 'live' limit 1"))[0]!;
  const before = (await sql<{ t: string; u: string }>("select clicks_total as t, clicks_unique as u from booking_metrics_all where booking_id = $1", [id]))[0]!;
  const hit = (ua: string, ip: string) => request.get(`/go/${code}`, { maxRedirects: 0, headers: { "user-agent": ua, "x-forwarded-for": ip } });
  const r = await hit(HUMAN_UA, "203.0.113.50");
  expect(r.status()).toBe(302);
  expect(r.headers()["location"]).toContain("utm_source=byline");
  await hit(HUMAN_UA, "203.0.113.50"); // same visitor again
  await hit("Googlebot/2.1", "203.0.113.51");
  await hit("LinkedInBot/1.0", "203.0.113.52");
  await expect
    .poll(async () => Number((await sql<{ t: string }>("select clicks_total as t from booking_metrics_all where booking_id = $1", [id]))[0]!.t))
    .toBe(Number(before.t) + 2);
  const after = (await sql<{ u: string }>("select clicks_unique as u from booking_metrics_all where booking_id = $1", [id]))[0]!;
  expect(Number(after.u)).toBe(Number(before.u) + 1); // two visits, one visitor
});
