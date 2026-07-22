"use client";

import { SITE } from "@/lib/content";
import { useFormPost } from "@/lib/useFormPost";
import Field, { Honeypot } from "./Field";
import Reveal from "./Reveal";

const BUDGETS = ["Under $10k", "$10k – $50k", "$50k – $150k", "$150k+"];
const SOURCES = ["Search", "Referral", "Social", "Event", "Other"];

export default function ContactForm() {
  const { submit, pending, done, error, fieldErrors } = useFormPost(
    "/api/contact",
    "contact",
  );

  return (
    <section id="contact" className="mx-auto mt-[88px] max-w-[1200px] px-5 sm:px-14">
      <div className="grid grid-cols-1 items-start gap-14 md:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <div className="eyebrow mb-4 tracking-[0.16em]">Get in touch</div>
          <h2 className="h2-section mb-[18px]">Tell us what you&rsquo;re building.</h2>
          <p className="m-0 mb-[34px] max-w-[400px] text-base leading-[1.55] text-t4">
            Send the shape of the problem. We&rsquo;ll reply within one business day with
            the fastest path to production.
          </p>

          <div className="flex flex-col gap-[18px]">
            <div>
              <div className="label-mono mb-[5px]">Email</div>
              <a
                href={`mailto:${SITE.email}`}
                className="font-display text-[17px] text-white hover:text-lime"
              >
                {SITE.email}
              </a>
            </div>
            <div>
              <div className="label-mono mb-[5px]">Phone</div>
              <a
                href={SITE.phoneHref}
                className="font-display text-[17px] text-white hover:text-lime"
              >
                {SITE.phone}
              </a>
            </div>
            <div>
              <div className="label-mono mb-[5px]">Studio</div>
              <div className="font-display text-[17px] text-t2">{SITE.location}</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="relative">
          {done ? (
            <div
              role="status"
              className="flex min-h-[220px] flex-col items-start justify-center gap-3 border border-lime bg-surface px-10 py-11"
            >
              <div className="font-mono text-xs font-bold tracking-[0.12em] text-lime">
                ▸ MESSAGE RECEIVED
              </div>
              <div className="font-display text-2xl leading-tight font-semibold">
                Thanks — we&rsquo;ll be in touch within one business day.
              </div>
              <p className="m-0 text-[14.5px] text-t4">
                In the meantime, reach us directly at{" "}
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
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

              {error ? (
                <p
                  role="alert"
                  className="m-0 border border-danger/40 bg-danger/8 px-4 py-3 font-mono text-[11.5px] text-danger xs:col-span-2"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="btn ease-brand cursor-pointer border-none bg-lime p-[15px] text-center text-[15px] font-semibold text-lime-ink transition-colors duration-160 not-disabled:hover:bg-lime-hover xs:col-span-2"
              >
                {pending ? "Sending…" : "Send message →"}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
