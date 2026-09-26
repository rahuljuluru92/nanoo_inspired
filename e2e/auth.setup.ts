import { test as setup, expect } from "@playwright/test";
import { STATE } from "./helpers";

for (const [role, label, home] of [["brand", "Enter as the demo brand", /\/desk/], ["creator", "Enter as the demo creator", /\/offers/]] as const) {
  setup(`sign in as the demo ${role}`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/login");
    await page.getByRole("button", { name: label }).click();
    await expect(page).toHaveURL(home);
    await ctx.storageState({ path: STATE[role] });
    await ctx.close();
  });
}
