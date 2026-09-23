"use client";

import { useEffect, useRef, useState } from "react";

/** How long the "Copied" state holds before the chip resets. */
const RESET_MS = 1600;

/**
 * The studio email as a chip: the address is a real mailto link, and a
 * separate button copies it. Copy feedback is a drawn check plus an aria-live
 * announcement; if the Clipboard API is unavailable (insecure context, old
 * browser) the button says so instead of failing silently.
 */
export default function CopyEmail({ email }: { readonly email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = window.setTimeout(() => setState("idle"), RESET_MS);
  };

  return (
    <div className="copy-chip" data-state={state}>
      <a href={`mailto:${email}`} className="copy-chip-mail">
        {email}
      </a>
      <button type="button" onClick={copy} className="copy-chip-btn" aria-label={`Copy ${email}`}>
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="copy-chip-icon">
          <path className="copy-chip-glyph" d="M5 5V2.5h8.5V11H11M2.5 5H11v8.5H2.5z" />
          <path className="copy-chip-check" d="M3 8.5l3 3 7-7" pathLength={1} />
        </svg>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? "Email address copied" : state === "failed" ? "Couldn’t copy — select the address instead" : ""}
      </span>
    </div>
  );
}
