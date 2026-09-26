import { Skeleton } from "./skeleton";

/** Shown by loading.tsx while a server page fetches: the shape of a page, so the layout doesn't jump when it arrives. */
export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-10 w-full max-w-md" />
        <div className="mt-10 grid gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 border-t border-line pt-4">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
