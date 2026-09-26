import { expect, test, type Browser, type Page } from "@playwright/test";
import { HUMAN_UA, LIVE, auditLedger, sql, watchErrors } from "./helpers";

/**
 * The whole product, with two brand-new people who have never met, through the real interface and the real database:
 *   brand joins → creator joins and sets a price → brand writes a brief, adds the creator, funds a wallet, places the hold →
 *   creator accepts, drafts → brand asks for changes → creator revises → brand approves → creator goes live →
 *   readers click the tracked link → brand releases the payout → the Receipt is public.
 * Then the ledger is audited: nothing was created or lost.
 */
const run = `${Date.now().toString(36)}`;
const PASSWORD = "e2e-password-1";
const brandEmail = `brand.${run}@example.test`;
const creatorEmail = `creator.${run}@example.test`;
const creatorName = `Eva Testwood ${run.replace(/\d/g, "x")}`;
const handle = creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const RATE = 300;

const ipFor = (n: number) => ({ "x-forwarded-for": `192.0.2.${(Number.parseInt(run.slice(-3), 36) % 200) + n}` });

async function person(browser: Browser, n: number) {
  const ctx = await browser.newContext({ extraHTTPHeaders: ipFor(n) });
  const page = await ctx.newPage();
  return { ctx, page, errors: watchErrors(page) };
}

async function toastSays(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}

test.describe.configure({ mode: "serial" });

let bookingId = "";
let trackingCode = "";

test("a brand joins and a creator joins and sets a price", async ({ browser }) => {
  const brand = await person(browser, 1);
  await brand.page.goto("/join");
  await brand.page.getByLabel("Your name").fill("Bea Buyer");
  await brand.page.getByLabel("Company").fill(`Testco ${run}`);
  await brand.page.getByLabel("Work email").fill(brandEmail);
  await brand.page.getByLabel("Password").fill(PASSWORD);
  await brand.page.getByRole("button", { name: "Create my desk" }).click();
  await expect(brand.page).toHaveURL(/\/desk/);
  await expect(brand.page.getByRole("heading", { level: 1 })).toContainText("SOC 2");
  await brand.page.context().storageState({ path: `.local/e2e/golden-brand.json` });
  brand.errors.assertNone();
  await brand.ctx.close();

  const creator = await person(browser, 2);
  const p = creator.page;
  await p.goto("/join");
  await p.getByText("I’m a creator").click();
  await p.getByLabel("Your name").fill(creatorName);
  await p.getByLabel("Email", { exact: true }).fill(creatorEmail);
  await p.getByLabel("Password").fill(PASSWORD);
  await p.getByRole("button", { name: "Continue to my kit" }).click();
  await expect(p).toHaveURL(/\/onboarding/);

  await expect(p.getByLabel("Handle")).toHaveValue(handle.slice(0, 40)); // derived from the name until you touch it
  await p.getByLabel("Headline").fill("Security lead writing about SOC 2 for fintech");
  await p.getByRole("button", { name: "Fintech", exact: true }).click();
  await p.getByLabel("Followers", { exact: true }).fill("14500");
  await p.getByLabel("Your rate per post (€)").fill(String(RATE));
  await p.getByLabel("Main audience country").selectOption("France");
  await p.getByRole("button", { name: "CTOs", exact: true }).click();
  await p.getByRole("button", { name: "France", exact: true }).click();

  // an incomplete form says what is wrong instead of failing silently
  await p.getByLabel("Headline").fill("");
  await p.getByRole("button", { name: "Join the roster" }).click();
  await expect(p.getByText(/headline/i).first()).toBeVisible();
  await p.getByLabel("Headline").fill("Security lead writing about SOC 2 for fintech");
  await p.getByRole("button", { name: "Join the roster" }).click();
  await expect(p).toHaveURL(/\/offers/);
  await p.context().storageState({ path: `.local/e2e/golden-creator.json` });
  creator.errors.assertNone();
  await creator.ctx.close();

  // the public kit is live immediately, for anyone
  const anon = await browser.newContext();
  const kit = await anon.newPage();
  await kit.goto(`/c/${handle.slice(0, 40)}`);
  await expect(kit.getByRole("heading", { level: 1 })).toHaveText(creatorName);
  await expect(kit.locator("body")).toContainText("€300");
  await anon.close();
});

test("the brand fills a wallet, adds the creator to a lineup and places the hold", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ".local/e2e/golden-brand.json", extraHTTPHeaders: ipFor(1) });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto("/desk");

  await page.getByRole("button", { name: `Add ${creatorName} to lineup` }).click();
  const tray = page.getByRole("region", { name: "Campaign tray" });
  await expect(tray).toContainText("€300");
  // nothing to spend yet: the tray says so and offers test funds
  await expect(tray.getByRole("alert")).toContainText("short");
  await tray.getByRole("button", { name: "Add test funds" }).click();
  await toastSays(page, "Test funds added");
  await expect(tray.getByRole("alert")).toHaveCount(0);

  // a hold needs somewhere to send readers; until then it is blocked, and says why
  await expect(tray).toContainText("destination link");
  await page.getByText("Campaign details").click();
  await page.getByLabel("Destination link").fill("https://testco.example/soc2-guide");
  await page.getByLabel("Key message").fill("SOC 2 in six weeks, not six months.");

  const hold = tray.getByRole("button", { name: /Hold to place in escrow/ });
  await expect(hold).toBeEnabled();
  await hold.press("Enter"); // the keyboard route to the same confirmation the press-and-hold gesture leads to
  const dialog = page.getByRole("dialog", { name: "Place this hold?" });
  await expect(dialog).toContainText("€300");
  await dialog.getByRole("button", { name: "Confirm and hold" }).click();

  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(creatorName) })).toContainText("Invited");

  const [row] = await sql<{ id: string; tracking_code: string; status: string; price_cents: number }>(
    "select b.id, b.tracking_code, b.status, b.price_cents from bookings b join creators c on c.id = b.creator_id where c.handle = $1",
    [handle.slice(0, 40)],
  );
  expect(row).toMatchObject({ status: "invited", price_cents: RATE * 100 });
  bookingId = row!.id;
  trackingCode = row!.tracking_code;
  const [escrow] = await sql<{ e: string }>("select coalesce(sum(amount_cents),0) as e from ledger_entries where booking_id = $1 and account = 'escrow'", [bookingId]);
  expect(Number(escrow!.e)).toBe(RATE * 100);

  errors.assertNone();
  await ctx.close();
});

test("the creator accepts, drafts, is asked for changes, revises", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: ".local/e2e/golden-creator.json", extraHTTPHeaders: ipFor(2) });
  const page = await ctx.newPage();
  const errors = watchErrors(page);

  await page.goto("/offers");
  await expect(page.getByText(`Testco ${run}`).first()).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await toastSays(page, "Offer accepted");

  await page.goto(`/deals/${bookingId}`);
  await page.getByLabel("Your post").fill("SOC 2 does not have to eat a quarter. Here is what we did in six weeks, and the one mistake we would not repeat.");
  await page.getByRole("button", { name: "Submit draft" }).click();
  await toastSays(page, "Draft submitted");

  // the brand asks for a change
  const brandCtx = await browser.newContext({ storageState: ".local/e2e/golden-brand.json", extraHTTPHeaders: ipFor(1) });
  const brand = await brandCtx.newPage();
  const brandErrors = watchErrors(brand);
  await brand.goto(`/campaigns/${(await sql<{ id: string }>("select campaign_id as id from bookings where id = $1", [bookingId]))[0]!.id}`);
  await brand.getByRole("button", { name: `Open ${creatorName}` }).click();
  const drawer = brand.getByRole("dialog", { name: creatorName });
  await expect(drawer).toContainText("SOC 2 does not have to eat a quarter");
  await drawer.getByRole("button", { name: "Request changes" }).click();
  await drawer.getByLabel("What should change?").fill("Please name the one mistake, and end with the guide link.");
  await drawer.getByRole("button", { name: "Send request" }).click();
  await toastSays(brand, "Changes requested");
  brandErrors.assertNone();
  await brandCtx.close();

  // the creator sees the note, revises, resubmits
  await page.goto(`/deals/${bookingId}`);
  await expect(page.getByText("Please name the one mistake, and end with the guide link.", { exact: true })).toBeVisible();
  await expect(page.getByText("Revise your draft")).toBeVisible();
  await page.getByLabel("Your post").fill("SOC 2 does not have to eat a quarter. The one mistake we would not repeat: starting with the tooling, not the scope. The guide is below.");
  await page.getByRole("button", { name: "Submit draft" }).click();
  await toastSays(page, "Draft submitted");

  const [b] = await sql<{ status: string; draft_version: number }>("select status, draft_version from bookings where id = $1", [bookingId]);
  expect(b).toMatchObject({ status: "drafted" });
  expect(b!.draft_version).toBeGreaterThanOrEqual(2);
  errors.assertNone();
  await ctx.close();
});

test("the brand approves, the creator goes live, readers click, the brand pays", async ({ browser, request }) => {
  const campaignId = (await sql<{ id: string }>("select campaign_id as id from bookings where id = $1", [bookingId]))[0]!.id;
  const brandCtx = await browser.newContext({ storageState: ".local/e2e/golden-brand.json", extraHTTPHeaders: ipFor(1) });
  const brand = await brandCtx.newPage();
  const brandErrors = watchErrors(brand);
  await brand.goto(`/campaigns/${campaignId}`);
  await brand.getByRole("button", { name: `Open ${creatorName}` }).click();
  let drawer = brand.getByRole("dialog", { name: creatorName });
  await expect(drawer).toContainText("The one mistake we would not repeat");
  await drawer.getByRole("button", { name: "Approve" }).click();
  await toastSays(brand, "Draft approved");

  const creatorCtx = await browser.newContext({ storageState: ".local/e2e/golden-creator.json", extraHTTPHeaders: ipFor(2) });
  const creator = await creatorCtx.newPage();
  const creatorErrors = watchErrors(creator);
  await creator.goto(`/deals/${bookingId}`);
  await expect(creator.getByText("Approved. Post it.")).toBeVisible();
  // a bad link is refused with a reason before anything changes
  await creator.getByLabel("Link to your live post").fill("not a link");
  await creator.getByRole("button", { name: "Mark as live" }).click();
  await expect(creator.getByRole("alert").filter({ hasText: /link/i }).first()).toBeVisible();
  await creator.getByLabel("Link to your live post").fill("https://www.linkedin.com/posts/eva-testwood_soc2-activity-1");
  await creator.getByRole("button", { name: "Mark as live" }).click();
  await expect(creator.getByRole("heading", { name: "You’re live" })).toBeVisible();
  await expect(creator.getByLabel("Your tracked link")).toHaveValue(new RegExp(`/go/${trackingCode}$`));

  // three readers: two different people, and the first one clicks twice (live: one person, three clicks, since the platform sets the IP)
  const go = (ua: string, ip: string) => request.get(`/go/${trackingCode}`, { maxRedirects: 0, headers: { "user-agent": ua, "x-forwarded-for": ip } });
  expect((await go(HUMAN_UA, "203.0.113.10")).status()).toBe(302);
  await go(HUMAN_UA, "203.0.113.10");
  await go(HUMAN_UA, "203.0.113.11");
  await go("Twitterbot/1.0", "203.0.113.12");
  const clicks = async () => (await sql<{ t: string; u: string }>("select clicks_total as t, clicks_unique as u from booking_metrics_all where booking_id = $1", [bookingId]))[0];
  await expect.poll(async () => (await clicks())?.t).toBe("3"); // the crawler is not counted
  // two visitors locally; on a live site the platform sets the IP, so all three clicks come from one visitor (or two, if we are behind a proxy)
  expect(["1", "2"]).toContain((await clicks())!.u);
  if (!LIVE) expect((await clicks())!.u).toBe("2");

  // the brand sees the clicks arrive and pays
  await brand.reload();
  await brand.getByRole("button", { name: `Open ${creatorName}` }).click();
  drawer = brand.getByRole("dialog", { name: creatorName });
  await expect(drawer).toContainText("Unique");
  await drawer.getByRole("button", { name: /Release €300 to Eva/ }).click();
  await brand.getByRole("dialog", { name: "Release €300?" }).getByRole("button", { name: "Release payout" }).click();
  await toastSays(brand, "Payout released");

  const [b] = await sql<{ status: string }>("select status from bookings where id = $1", [bookingId]);
  expect(b!.status).toBe("paid");
  brandErrors.assertNone();
  creatorErrors.assertNone();
  await brandCtx.close();
  await creatorCtx.close();
});

test("the Receipt is public and the creator has been paid in full", async ({ browser }) => {
  const anon = await browser.newContext();
  const page = await anon.newPage();
  const errors = watchErrors(page);
  await page.goto(`/receipt/${trackingCode}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toContainText(creatorName);
  await expect(page.locator("body")).toContainText("€300");
  errors.assertNone();
  await anon.close();

  const creatorCtx = await browser.newContext({ storageState: ".local/e2e/golden-creator.json", extraHTTPHeaders: ipFor(2) });
  const creator = await creatorCtx.newPage();
  await creator.goto("/earnings");
  await expect(creator.locator("main")).toContainText("€300");
  await creatorCtx.close();
});

test("the books balance: nothing created, nothing lost", async () => {
  expect(await auditLedger()).toEqual([]);
  // and this deal paid the creator exactly the price, with nothing skimmed
  const [paid] = await sql<{ n: string }>("select coalesce(sum(amount_cents),0) as n from ledger_entries where booking_id = $1 and account = 'creator_balance'", [bookingId]);
  expect(Number(paid!.n)).toBe(RATE * 100);
});
