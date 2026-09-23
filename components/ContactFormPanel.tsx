"use client";

import { useFormPost } from "@/lib/useFormPost";
import { useTurnstileGate } from "@/lib/hooks";
import Field, { Honeypot } from "./Field";
import TurnstileField from "./TurnstileField";

const BUDGETS = ["Under $10k", "$10k – $50k", "$50k – $150k", "$150k+"];
const SOURCES = ["Search", "Referral", "Social", "Event", "Other"];

type Props = {
  email: string;
  /** Cloudflare Turnstile site key (public). Empty ⇒ not configured for this
   *  environment (local dev / e2e), so the widget is skipped. */
  turnstileSiteKey: string;
};

/**
 * The contact form itself (fields, Turnstile, submit, the success panel) —
 * shared by the homepage's ContactForm section and the landing's contact tabs.
 */
export default function ContactFormPanel({ email, turnstileSiteKey }: Props) {
  const { submit, pending, done, error, fieldErrors } = useFormPost(
    "/api/contact",
    "contact",
  );

  const gate = useTurnstileGate(turnstileSiteKey, error);

  return (
    <>
      {done ? (
        <div
          role="status"
          className="clip-angular-26 flex min-h-[220px] flex-col items-start justify-center gap-3 border border-lime bg-surface px-10 py-11"
        >
          <div className="font-mono text-12 font-bold tracking-label text-lime">
            ▸ MESSAGE RECEIVED
          </div>
          <div className="font-display text-22 leading-tight font-semibold">
            Thanks — we&rsquo;ll be in touch within one business day.
          </div>
          <p className="m-0 text-15 text-t4">
            In the meantime, email us directly at{" "}
            <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </div>
      ) : (
        <form
          onSubmit={gate.guard(submit)}
          noValidate
          className="relative grid grid-cols-1 gap-4 xs:grid-cols-2"
        >
          <Honeypot />

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
                placeholder="you@company.com"
              />
            )}
          </Field>

          <Field
            label="Company"
            name="company"
            error={fieldErrors.company}
            className="xs:col-span-2"
          >
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="organization"
                disabled={pending}
                placeholder="Company or team"
              />
            )}
          </Field>

          <Field label="Budget" name="budget" error={fieldErrors.budget}>
            {(props) => (
              <select {...props} defaultValue="" disabled={pending}>
                <option value="">Select range</option>
                {BUDGETS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="How did you hear about us"
            name="source"
            error={fieldErrors.source}
          >
            {(props) => (
              <select {...props} defaultValue="" disabled={pending}>
                <option value="">Select one</option>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="What are you building"
            name="message"
            error={fieldErrors.message}
            className="xs:col-span-2"
          >
            {(props) => (
              <textarea
                {...props}
                className={`${props.className} resize-y font-body`}
                rows={4}
                disabled={pending}
                placeholder="A few lines on the problem, stack, and timeline."
              />
            )}
          </Field>

          <TurnstileField
            siteKey={turnstileSiteKey}
            gate={gate}
            email={email}
            className="xs:col-span-2"
          />

          {error ? (
            <p role="alert" className="form-alert xs:col-span-2">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || (gate.enabled && gate.widgetFailed)}
            aria-busy={pending || undefined}
            className="btn btn-lime w-full border-none text-center xs:col-span-2"
          >
            {pending ? "Sending…" : "Send message →"}
          </button>
        </form>
      )}
    </>
  );
}
