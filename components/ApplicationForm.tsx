"use client";

import { useFormPost } from "@/lib/useFormPost";
import Field, { Honeypot } from "./Field";

export default function ApplicationForm({
  role,
  contactEmail,
}: {
  role: string;
  contactEmail: string;
}) {
  const { submit, pending, done, error, fieldErrors } = useFormPost(
    "/api/apply",
    "application",
  );

  if (done) {
    return (
      <div
        role="status"
        className="flex min-h-[220px] flex-col items-start justify-center gap-3 border border-lime bg-surface px-8 py-10"
      >
        <div className="font-mono text-xs font-bold tracking-[0.12em] text-lime">
          ▸ APPLICATION RECEIVED
        </div>
        <div className="font-display text-2xl leading-tight font-semibold">
          Thanks — we read every application.
        </div>
        <p className="m-0 text-[14.5px] text-t4">
          You&rsquo;ll hear from a person, not an autoresponder, within five business
          days. Questions in the meantime:{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-4">
      <Honeypot />
      {/* Carried in the payload so the notification email says which role. */}
      <input type="hidden" name="role" value={role} />

      <Field label="Name" name="name" error={fieldErrors.name}>
        {(props) => (
          <input
            {...props}
            type="text"
            autoComplete="name"
            disabled={pending}
            placeholder="Your name"
          />
        )}
      </Field>

      <Field label="Email" name="email" error={fieldErrors.email}>
        {(props) => (
          <input
            {...props}
            type="email"
            autoComplete="email"
            disabled={pending}
            placeholder="you@domain.com"
          />
        )}
      </Field>

      <Field label="Links" name="links" error={fieldErrors.links}>
        {(props) => (
          <input
            {...props}
            type="text"
            disabled={pending}
            placeholder="GitHub, portfolio, LinkedIn — whatever shows your work"
          />
        )}
      </Field>

      <Field label="Why this role" name="note" error={fieldErrors.note}>
        {(props) => (
          <textarea
            {...props}
            className={`${props.className} resize-y font-body`}
            rows={5}
            disabled={pending}
            placeholder="A few lines on what you'd want to own here, and something you've built that you're proud of."
          />
        )}
      </Field>

      {error ? (
        <p
          role="alert"
          className="m-0 border border-danger/40 bg-danger/8 px-4 py-3 font-mono text-[11.5px] text-danger"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-lime cursor-pointer border-none text-center"
      >
        {pending ? "Sending…" : "Send application →"}
      </button>
    </form>
  );
}
