import type { ReactNode } from "react";

/** Names the space, explains it in a line, offers a verb. Never "Nothing here yet." */
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border-y border-line px-4 py-10 text-center">
      <h3 className="text-title">{title}</h3>
      <p className="mx-auto mt-2 max-w-prose text-small text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
