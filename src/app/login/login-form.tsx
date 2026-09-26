"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction, type FormState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-8 grid gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email">{(p) => <Input type="email" name="email" autoComplete="email" defaultValue={state.values?.email} required {...p} />}</Field>
      <Field label="Password">{(p) => <Input type="password" name="password" autoComplete="current-password" required {...p} />}</Field>
      {state.error ? (
        <p role="alert" className="border border-vermilion-ink px-3 py-2 text-small">
          {state.error}
        </p>
      ) : null}
      <SubmitButton variant="primary" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
