import Link from "next/link";
import { cn } from "@/lib/cn";

/** The "line" in Byline is literally a line: a 2 px vermilion rule under italic serif. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} aria-label="Byline — home" className={cn("inline-flex min-h-11 items-center font-serif text-[1.6rem] italic leading-none", className)}>
      <span className="inline-block border-b-2 border-vermilion pb-0.5">Byline</span>
    </Link>
  );
}
