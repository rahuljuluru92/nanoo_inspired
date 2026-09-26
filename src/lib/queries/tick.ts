import "server-only";
import { cache } from "react";
import { asUser } from "@/lib/db";

/**
 * Let sandbox creators act on anything that is due — once per request, BEFORE anything reads.
 * The layout and the page render in parallel; `cache()` gives them the same promise, so whichever asks first runs
 * the tick and the other waits for it. Without this a page can read state one step behind what the layout just wrote.
 */
export const tickSandbox = cache(async (userId: string): Promise<void> => {
  await asUser(userId, (c) => c.query("select sandbox_tick()"));
});
