"use client";

import { ErrorPanel } from "@/components/ui/error-panel";

export default function BrandError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel reset={reset} digest={error.digest} home="/desk" />;
}
