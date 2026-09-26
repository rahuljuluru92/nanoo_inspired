"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProfileAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { mixToShares, slugify, validateProfile, type ProfileErrors } from "@/lib/profile";
import { BUYERS, GEOS, VERTICALS } from "@/lib/taxonomy";
import { ShareMix, type MixRow } from "./share-mix";

export interface ProfileFormValues {
  displayName: string;
  handle: string;
  headline: string;
  bio: string;
  country: string;
  verticals: string[];
  followers: string;
  rateEuros: string;
  typicalImpressions: string;
  roles: MixRow[];
  geo: MixRow[];
}

/** One form for onboarding and for editing the kit. Fields are validated as you go and again on the server. */
export function ProfileForm({ initial, mode }: { initial: ProfileFormValues; mode: "onboarding" | "kit" }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [handleTouched, setHandleTouched] = useState(mode === "kit" || initial.handle !== "");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [pending, setPending] = useState(false);
  const set = <K extends keyof ProfileFormValues>(k: K, val: ProfileFormValues[K]) => setV((x) => ({ ...x, [k]: val }));

  const toInput = () => ({
    displayName: v.displayName,
    handle: v.handle,
    headline: v.headline,
    bio: v.bio,
    country: v.country,
    verticals: v.verticals,
    followers: v.followers.trim() === "" ? Number.NaN : Number(v.followers),
    rateEuros: v.rateEuros.trim() === "" ? Number.NaN : Number(v.rateEuros),
    typicalImpressions: v.typicalImpressions.trim() === "" ? null : Number(v.typicalImpressions),
    roles: mixToShares(v.roles),
    geo: mixToShares(v.geo),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = toInput();
    const local = validateProfile(input);
    setErrors(local);
    if (Object.keys(local).length) {
      toast.push({ title: "A few things to fix", body: "Check the highlighted fields.", tone: "error" });
      return;
    }
    setPending(true);
    const r = await saveProfileAction(input);
    setPending(false);
    if (!r.ok) {
      setErrors(r.fields ?? {});
      toast.push({ title: "Couldn’t save your profile", body: r.error.message, tone: "error" });
      return;
    }
    if (mode === "onboarding") {
      toast.push({ title: "You’re on the roster", body: "Brands can now find and book you." });
      router.push("/offers");
    } else {
      toast.push({ title: "Kit saved", body: "Your public page is up to date." });
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" error={errors.displayName}>
          {(p) => (
            <Input
              value={v.displayName}
              autoComplete="name"
              maxLength={80}
              onChange={(e) => {
                set("displayName", e.target.value);
                if (!handleTouched) set("handle", slugify(e.target.value));
              }}
              {...p}
            />
          )}
        </Field>
        <Field label="Handle" hint={`byline.example/c/${v.handle || "your-handle"}`} error={errors.handle}>
          {(p) => (
            <Input
              value={v.handle}
              autoCapitalize="none"
              spellCheck={false}
              maxLength={40}
              onChange={(e) => {
                setHandleTouched(true);
                set("handle", e.target.value.toLowerCase());
              }}
              {...p}
            />
          )}
        </Field>
      </div>

      <Field label="Headline" hint="What you write about, in one line." error={errors.headline}>
        {(p) => <Input value={v.headline} maxLength={120} placeholder="Security lead writing about SOC 2 for fintech" onChange={(e) => set("headline", e.target.value)} {...p} />}
      </Field>
      <Field label="Short bio (optional)" hint={`${v.bio.length}/600`} error={errors.bio}>
        {(p) => <Textarea value={v.bio} maxLength={600} className="min-h-24" onChange={(e) => set("bio", e.target.value)} {...p} />}
      </Field>

      <fieldset>
        <legend className="text-small font-medium">Your verticals</legend>
        <p className="mt-0.5 text-caption text-muted">Pick one to three. Brands search by these.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {VERTICALS.map((x) => {
            const on = v.verticals.includes(x);
            const locked = !on && v.verticals.length >= 3;
            return (
              <button
                key={x}
                type="button"
                aria-pressed={on}
                disabled={locked}
                onClick={() => set("verticals", on ? v.verticals.filter((y) => y !== x) : [...v.verticals, x])}
                className={cn("min-h-11 rounded-sm border px-3 text-small transition-colors duration-[var(--dur-1)] disabled:opacity-40", on ? "border-ink bg-highlight" : "border-line-strong hover:border-ink")}
              >
                {x}
              </button>
            );
          })}
        </div>
        {errors.verticals ? (
          <p role="alert" className="mt-1.5 text-small text-vermilion-ink">
            {errors.verticals}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Followers" hint="As shown on your LinkedIn profile." error={errors.followers}>
          {(p) => <Input inputMode="numeric" value={v.followers} onChange={(e) => set("followers", e.target.value.replace(/[^\d]/g, "").slice(0, 8))} {...p} />}
        </Field>
        <Field label="Typical impressions per post (optional)" hint="Blank: we estimate from your followers." error={errors.impressions}>
          {(p) => <Input inputMode="numeric" value={v.typicalImpressions} onChange={(e) => set("typicalImpressions", e.target.value.replace(/[^\d]/g, "").slice(0, 9))} {...p} />}
        </Field>
        <Field label="Your rate per post (€)" hint="You set it, brands see it before booking, you keep 100%." error={errors.rate}>
          {(p) => <Input inputMode="numeric" value={v.rateEuros} className="font-mono" onChange={(e) => set("rateEuros", e.target.value.replace(/[^\d]/g, "").slice(0, 4))} {...p} />}
        </Field>
        <Field label="Main audience country" error={errors.country}>
          {(p) => (
            <Select value={v.country} onChange={(e) => set("country", e.target.value)} {...p}>
              <option value="">Choose…</option>
              {GEOS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <ShareMix legend="Who reads you?" hint="Up to three roles, roughly. Self-reported, and shown that way." options={[...BUYERS]} max={3} value={v.roles} onChange={(x) => set("roles", x)} />
      <ShareMix legend="Where are they?" hint="Up to two countries." options={[...GEOS]} max={2} value={v.geo} onChange={(x) => set("geo", x)} defaultPct={30} />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" pending={pending} className="w-full sm:w-auto">
          {mode === "onboarding" ? "Join the roster" : "Save kit"}
        </Button>
        {mode === "kit" ? (
          <a href={`/c/${v.handle}`} className="inline-flex min-h-11 items-center text-small underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            View public page
          </a>
        ) : null}
      </div>
    </form>
  );
}
