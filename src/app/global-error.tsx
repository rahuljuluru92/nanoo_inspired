"use client";

/** Last resort: the root layout itself failed, so this must bring its own <html>. Plain and self-contained on purpose. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f5f1ea", color: "#15130f", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: 480, padding: 24 }} role="alert">
          <h1 style={{ fontWeight: 400, fontSize: 32, margin: "0 0 8px" }}>That didn’t load.</h1>
          <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>Something went wrong on our side. Nothing you did was lost.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 20px", background: "#ff4b1f", color: "#15130f", border: "1px solid #15130f", fontSize: 16, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
