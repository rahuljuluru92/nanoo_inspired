import { expect, test } from "@playwright/test";
import { STATE, axeViolations, overflowPx, seeded, smallTargets, watchErrors } from "./helpers";

/**
 * Every screen, at every width a real device might have. Per screen and width:
 *  - the page never scrolls sideways,
 *  - on touch-sized widths every control is at least 44 px tall,
 *  - axe finds no WCAG 2.2 AA problem (checked at the two extremes and the middle, where layout changes),
 *  - the browser console stays silent.
 */
const WIDTHS = [320, 375, 768, 1024, 1280, 1536, 1920] as const;
const AXE_AT = new Set<number>([320, 768, 1280]);

type Ids = Awaited<ReturnType<typeof seeded>>;
interface Screen {
  name: string;
  as: "public" | "brand" | "creator";
  path: (ids: Ids) => string;
}

const SCREENS: Screen[] = [
  { name: "landing", as: "public", path: () => "/" },
  { name: "sign in", as: "public", path: () => "/login" },
  { name: "join", as: "public", path: () => "/join" },
  { name: "developers", as: "public", path: () => "/developers" },
  { name: "creator kit (public)", as: "public", path: () => "/c/maya-okafor" },
  { name: "receipt", as: "public", path: (i) => `/receipt/${i.paidReceipt}` },
  { name: "not found", as: "public", path: () => "/no-such-page" },
  { name: "desk", as: "brand", path: () => "/desk" },
  { name: "desk with a brief", as: "brand", path: () => "/desk?product=a+SOC+2+automation+tool&buyers=CTOs&geo=France&budget=6000" },
  { name: "campaigns", as: "brand", path: () => "/campaigns" },
  { name: "campaign board", as: "brand", path: (i) => `/campaigns/${i.brandCampaign}` },
  { name: "wallet", as: "brand", path: () => "/wallet" },
  { name: "wire", as: "brand", path: () => "/wire" },
  { name: "offers", as: "creator", path: () => "/offers" },
  { name: "deals", as: "creator", path: () => "/deals" },
  { name: "deal", as: "creator", path: (i) => `/deals/${i.mayaDeal}` },
  { name: "earnings", as: "creator", path: () => "/earnings" },
  { name: "kit editor", as: "creator", path: () => "/kit" },
];

for (const screen of SCREENS) {
  test(`${screen.name}: fits, is usable and is accessible at every width`, async ({ browser }) => {
    const ids = await seeded();
    const problems: string[] = [];
    const errorLists: (() => void)[] = [];

    // up to a tablet's width the device is touch-first, so controls must be finger-sized; beyond it, a mouse is assumed
    for (const touch of [true, false]) {
      const ctx = await browser.newContext({ hasTouch: touch, ...(screen.as === "public" ? {} : { storageState: STATE[screen.as] }) });
      const page = await ctx.newPage();
      // a 404 page is *supposed* to answer 404, and the browser logs that as a console error
      const errors = watchErrors(page, screen.name === "not found" ? [/status of 404/] : []);
      errorLists.push(errors.assertNone);

      for (const w of WIDTHS.filter((x) => (x <= 1024) === touch)) {
        await page.setViewportSize({ width: w, height: w < 768 ? 800 : 900 });
        await page.goto(screen.path(ids), { waitUntil: "load" });
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await page.waitForTimeout(350); // let the count-up and entrance motion settle

        const over = await overflowPx(page);
        if (over > 0) problems.push(`${w}px: page scrolls sideways by ${over}px`);
        if (touch) for (const t of await smallTargets(page)) problems.push(`${w}px: small touch target ${t}`);
        if (AXE_AT.has(w)) for (const v of await axeViolations(page)) problems.push(`${w}px: axe ${v}`);
      }
      await ctx.close();
    }

    expect(problems, problems.join("\n")).toEqual([]);
    errorLists.forEach((f) => f());
  });
}
