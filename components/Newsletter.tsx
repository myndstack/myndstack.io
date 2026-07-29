"use client";

import { useFormPost } from "@/lib/useFormPost";
import { Honeypot } from "./Field";

export default function Newsletter() {
  const { submit, pending, done, error, fieldErrors } = useFormPost(
    "/api/newsletter",
    "newsletter",
  );

  if (done) {
    return (
      <div
        role="status"
        className="mt-2.5 font-mono text-[11px] tracking-[0.04em] text-lime"
      >
        ▸ Subscribed. Watch your inbox.
      </div>
    );
  }

  const message = fieldErrors.email ?? error;

  return (
    <div>
      <form onSubmit={submit} noValidate className="relative">
        <Honeypot />
        <div
          className={`flex max-w-[300px] border ${message ? "border-danger" : "border-line-3"}`}
        >
          <input
            name="email"
            type="email"
            autoComplete="email"
            disabled={pending}
            aria-label="Email address"
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? "newsletter-error" : undefined}
            placeholder="you@company.com"
            className="ms-field flex-1 border-none bg-transparent px-3.5 py-3"
          />
          <button
            type="submit"
            disabled={pending}
            aria-label="Subscribe"
            className="cursor-pointer border-none bg-lime px-[18px] font-mono text-[15px] font-bold text-lime-ink disabled:opacity-60"
          >
            {pending ? "…" : "→"}
          </button>
        </div>
      </form>

      {message ? (
        <p id="newsletter-error" role="alert" className="mt-2 mb-0 font-mono text-[11px] text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
