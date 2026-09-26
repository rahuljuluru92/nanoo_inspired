import { expect, test, type Page } from "@playwright/test";
import { STATE } from "./helpers";

/** Everything a keyboard user needs: a skip link, a visible focus ring, dialogs that hold focus and give it back. */

const focusRing = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "none";
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2;
    const ring = cs.boxShadow !== "none";
    return outline || ring ? "visible" : `none on <${el.tagName.toLowerCase()}> ${(el.textContent || "").trim().slice(0, 20)}`;
  });

async function tabTo(page: Page, matches: (label: string) => boolean, max = 80): Promise<boolean> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? el.getAttribute("aria-label") || el.textContent?.trim() || "" : "";
    });
    if (matches(label)) return true;
  }
  return false;
}

for (const path of ["/", "/login", "/join", "/developers", "/c/maya-okafor"]) {
  test(`${path}: the first Tab reaches a skip link, and it works`, async ({ page }) => {
    await page.goto(path);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
}

test("every stop on the way to the first lineup button shows a focus ring", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE.brand });
  const page = await ctx.newPage();
  await page.goto("/desk");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // the page streams in behind a skeleton; tab through the real thing
  const missing: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const ring = await focusRing(page);
    if (ring !== "visible") missing.push(ring);
    const label = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    if (/^Add .* to lineup$/.test(label)) break;
  }
  expect(missing, missing.join("\n")).toEqual([]);
  await ctx.close();
});

test("a lineup can be built and held without a mouse; the dialog holds focus and gives it back", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE.brand });
  const page = await ctx.newPage();
  await page.goto("/desk");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await tabTo(page, (l) => /^Add .* to lineup$/.test(l))).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Remove .* from lineup$/ })).toHaveAttribute("aria-pressed", "true");

  // the details the hold needs, by keyboard
  await page.locator("summary").filter({ hasText: "Campaign details" }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Destination link").fill("https://halcyon.example/soc2-guide");

  const hold = page.getByRole("button", { name: /Hold to place in escrow/ });
  await hold.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Place this hold?" });
  await expect(dialog).toBeVisible();
  // focus is inside the dialog, and Tab never leaves it
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(hold).toBeFocused();
  await ctx.close();
});

test("the brief sentence can be edited from the keyboard", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE.brand });
  const page = await ctx.newPage();
  await page.goto("/desk");
  const budget = page.getByRole("button", { name: /^Budget: .* Edit$/ });
  await budget.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(budget).toBeFocused();
  await ctx.close();
});

test("with reduced motion, the hold is a click that opens the confirmation (no press-and-hold gesture needed)", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE.brand, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/desk");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /^Add .* to lineup$/ }).first().click();
  await page.locator("summary").filter({ hasText: "Campaign details" }).click();
  await page.getByLabel("Destination link").fill("https://halcyon.example/soc2-guide");
  await page.getByRole("region", { name: "Campaign tray" }).getByRole("button", { name: /Hold to place in escrow/ }).click();
  await expect(page.getByRole("dialog", { name: "Place this hold?" })).toBeVisible();
  await expect(page.getByText("Click to review and confirm.")).toBeVisible();
  await ctx.close();
});
