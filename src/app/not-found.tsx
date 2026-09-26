import { Wordmark } from "@/components/art/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { Dateline } from "@/components/ui/dateline";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <Wordmark />
      <Dateline>404 · not on the wire</Dateline>
      <h1 className="text-display">That page isn’t here.</h1>
      <p className="max-w-prose text-body text-muted">The link may be mistyped, revoked by the brand, or from a campaign that no longer exists.</p>
      <div>
        <ButtonLink href="/" variant="primary">
          Back to Byline
        </ButtonLink>
      </div>
    </main>
  );
}
