import type { ReactNode } from "react";

/** Names the space, explains it in a line, offers a verb. Never "Nothing here yet." `level` keeps the heading order valid. */
export function EmptyState({ title, body, action, level = 2 }: { title: string; body: string; action?: ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="border-y border-line px-4 py-10 text-center">
      <H className="text-title">{title}</H>
      <p className="mx-auto mt-2 max-w-prose text-small text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
