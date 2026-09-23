"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Keeps the layout chrome (nav, spine, footer) so a
 * failed section doesn't strand the visitor on a bare page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="page-column flex min-h-[70vh] flex-col items-start justify-center pt-[calc(72px+var(--nav-height))] pb-22">
      <div className="eyebrow mb-4">Error</div>
      <h1 className="m-0 mb-4 font-display text-30 sm:text-56 leading-none font-bold tracking-display text-balance">
        Something in the stack
        <br />
        <span className="text-lime">gave way.</span>
      </h1>
      <p className="m-0 mb-9 max-w-[460px] text-17 leading-body text-t4">
        This one is on us, not you. Try again — and if it keeps happening, tell us
        what you were doing and we&rsquo;ll fix it.
      </p>

      {error.digest ? (
        <p className="mb-9 font-mono text-11 tracking-label text-t5 uppercase">
          Reference {error.digest}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={reset} className="btn btn-lime cursor-pointer">
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Back to home →
        </Link>
      </div>
    </section>
  );
}
