import { expect, test } from "@playwright/test";
import { overflowPx, watchErrors } from "./helpers";

/**
 * The same journeys on WebKit with an iPhone's viewport and touch: the engine every iOS browser uses. Safari differs from Chrome in
 * cookies, pointer events, 100dvh, sticky positioning and form controls, so the money path is walked here too.
 */
// Safari reports a link prefetch that a fast navigation cancelled as an unhandled "access control checks" error; it is not a failure.
const CANCELLED_PREFETCH = /_rsc=.*access control checks/;

test("a phone: landing → demo brand → lineup → hold → campaign, then the creator side", async ({ page }) => {
  const errors = watchErrors(page, [CANCELLED_PREFETCH]);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await overflowPx(page)).toBe(0);

  await page.goto("/login");
  await page.getByRole("button", { name: "Enter as the demo brand" }).click();
  await expect(page).toHaveURL(/\/desk/);
  expect(await overflowPx(page)).toBe(0);

  // the brief is a sentence you tap; the lineup re-ranks
  await page.getByRole("button", { name: /^Budget: .* Edit$/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /^Add .* to lineup$/ }).first().click();
  const peek = page.getByRole("button", { name: /Review/ });
  await expect(peek).toContainText("1 ·");
  await peek.click();
  const sheet = page.getByRole("dialog", { name: /Your tray/ });
  await expect(sheet).toBeVisible();

  // destination link first (the hold says so), then press and hold
  await expect(sheet).toContainText("destination link");
  await sheet.getByRole("button", { name: "Fill in details" }).click();
  await page.getByLabel("Destination link").fill("https://halcyon.example/soc2-guide");
  await peek.click();
  const hold = page.getByRole("dialog", { name: /Your tray/ }).getByRole("button", { name: /Hold to place in escrow/ });
  await expect(hold).toBeEnabled();
  await hold.hover(); // waits for the sheet's slide-in to finish, then moves the pointer onto the button
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  expect(await overflowPx(page)).toBe(0);

  // bottom tabs navigate on a phone
  await page.getByRole("link", { name: "Wallet" }).last().click();
  await expect(page).toHaveURL(/\/wallet/);
  expect(await overflowPx(page)).toBe(0);

  // a reader's view: the public creator kit and a Receipt
  await page.goto("/c/maya-okafor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maya Okafor");
  expect(await overflowPx(page)).toBe(0);

  errors.assertNone();
});

test("a phone: the demo creator accepts an offer", async ({ page }) => {
  const errors = watchErrors(page, [CANCELLED_PREFETCH]);
  await page.goto("/login");
  await page.getByRole("button", { name: "Enter as the demo creator" }).click();
  await expect(page).toHaveURL(/\/offers/);
  expect(await overflowPx(page)).toBe(0);
  await page.getByRole("button", { name: "Accept" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Offer accepted" }).first()).toBeVisible();
  await page.goto("/earnings");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await overflowPx(page)).toBe(0);
  errors.assertNone();
});
