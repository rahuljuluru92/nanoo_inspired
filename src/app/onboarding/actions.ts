"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { toAppError, type AppError } from "@/lib/errors";
import { validateProfile, type ProfileErrors, type ProfileInput } from "@/lib/profile";

export type SaveProfileResult = { ok: true; handle: string } | { ok: false; error: AppError; fields?: ProfileErrors };

const FIELD_OF: Record<string, keyof ProfileErrors> = {
  handle_taken: "handle",
  invalid_handle: "handle",
  invalid_headline: "headline",
  invalid_rate: "rate",
  invalid_followers: "followers",
  invalid_verticals: "verticals",
  invalid_name: "displayName",
  bio_too_long: "bio",
  invalid_impressions: "impressions",
};

/** Create or update the signed-in creator's own profile. Validated here, and again by the database. */
export async function saveProfileAction(input: ProfileInput): Promise<SaveProfileResult> {
  const s = await getSession();
  if (!s || s.role !== "creator") return { ok: false, error: { code: "not_signed_in", message: "Your session ended. Sign in again to continue." } };
  const fields = validateProfile(input);
  if (Object.keys(fields).length) return { ok: false, error: { code: "invalid", message: "Check the highlighted fields." }, fields };
  try {
    await asUser(s.accountId, (c) =>
      c.query("select save_creator_profile($1,$2,$3,$4,$5,$6::text[],$7,$8,$9,$10::jsonb,$11::jsonb)", [
        input.displayName,
        input.handle,
        input.headline,
        input.bio,
        input.country,
        input.verticals,
        Math.round(input.followers),
        Math.round(input.rateEuros * 100),
        input.typicalImpressions === null ? null : Math.round(input.typicalImpressions),
        JSON.stringify(input.roles),
        JSON.stringify(input.geo),
      ]),
    );
    revalidatePath("/", "layout");
    return { ok: true, handle: input.handle };
  } catch (e) {
    const error = toAppError(e);
    const f = FIELD_OF[error.code];
    return { ok: false, error, fields: f ? { [f]: error.message } : undefined };
  }
}
