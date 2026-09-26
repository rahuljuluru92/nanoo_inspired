"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/** A form submit button that shows pending state from the enclosing <form action>. */
export function SubmitButton(props: Omit<ButtonProps, "type" | "pending">) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" pending={pending} />;
}
