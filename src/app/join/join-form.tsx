"use client";

import { useActionState, useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { registerAction, type FormState } from "../login/actions";

const DOORS = [
  { value: "brand", title: "I’m booking creators", body: "Write a brief, assemble a lineup, and watch results arrive." },
  { value: "creator", title: "I’m a creator", body: "Get offers at your own price and build a media kit of receipts." },
] as const;

export function JoinForm({ next, defaultRole = "brand" }: { next?: string; defaultRole?: "brand" | "creator" }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  const [role, setRole] = useState<string>(state.values?.role ?? defaultRole);
  return (
    <form action={action} className="mt-8 grid gap-6" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <fieldset>
        <legend className="mb-2 text-small font-medium">Which desk are you joining?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOORS.map((d) => (
            <label key={d.value} className={cn("block cursor-pointer border p-4", role === d.value ? "border-ink bg-highlight/30" : "border-line-strong hover:border-ink")}>
              <input type="radio" name="role" value={d.value} checked={role === d.value} onChange={() => setRole(d.value)} className="sr-only" />
              <span className="block font-serif text-title leading-tight">{d.title}</span>
              <span className="mt-1 block text-small text-muted">{d.body}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Your name">{(p) => <Input name="name" autoComplete="name" defaultValue={state.values?.name} {...p} />}</Field>
      {role === "brand" ? <Field label="Company">{(p) => <Input name="company" autoComplete="organization" defaultValue={state.values?.company} {...p} />}</Field> : null}
      <Field label={role === "brand" ? "Work email" : "Email"}>{(p) => <Input type="email" name="email" autoComplete="email" defaultValue={state.values?.email} {...p} />}</Field>
      <Field label="Password" hint="At least 8 characters.">{(p) => <Input type="password" name="password" autoComplete="new-password" {...p} />}</Field>

      {state.error ? (
        <p role="alert" className="border border-vermilion-ink px-3 py-2 text-small">
          {state.error}
        </p>
      ) : null}
      <SubmitButton variant="primary" className="w-full sm:w-auto">
        {role === "brand" ? "Create my desk" : "Continue to my kit"}
      </SubmitButton>
    </form>
  );
}
