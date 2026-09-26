"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function markNotificationsReadAction(): Promise<void> {
  const s = await getSession();
  if (!s) return;
  await asUser(s.accountId, (c) => c.query("select mark_notifications_read()"));
  revalidatePath("/", "layout");
}
