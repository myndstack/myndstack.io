"use client";

import BookingEmbed from "./BookingEmbed";
import ContactFormPanel from "./ContactFormPanel";
import Reveal from "./Reveal";

/** Contact details from site settings — kept to primitives so this client
 *  component needn't import the server-only query types. */
type Props = {
  email: string;
  phone: string;
  phoneHref: string;
  location: string;
  /** Cloudflare Turnstile site key (public). Empty ⇒ not configured for this
   *  environment (local dev / e2e), so the widget is skipped — see the note. */
  turnstileSiteKey: string;
};

export default function ContactForm({
  email,
  phone,
  phoneHref,
  location,
  turnstileSiteKey,
}: Props) {
  return (
    <section id="contact" className="mx-auto max-w-[1200px] px-5 pt-22 sm:px-14">
      <div className="grid grid-cols-1 items-start gap-14 md:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <div className="eyebrow mb-4">Get in touch</div>
          <h2 className="h2-section mb-4">Tell us what you&rsquo;re building.</h2>
          <p className="m-0 mb-8 max-w-[400px] text-17 leading-body text-t4">
            Send the shape of the problem. We&rsquo;ll reply within one business day with
            the fastest path to production.
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <div className="label-mono mb-1">Email</div>
              {/* Inline element, so the vertical padding costs no layout at all
                  — it only grows the hit area from 22px to 30px (WCAG 2.5.8). */}
              <a
                href={`mailto:${email}`}
                className="py-1 font-display text-17 text-t1 hover:text-lime"
              >
                {email}
              </a>
            </div>
            <div>
              <div className="label-mono mb-1">Phone</div>
              <a
                href={phoneHref}
                className="py-1 font-display text-17 text-t1 hover:text-lime"
              >
                {phone}
              </a>
            </div>
            <div>
              <div className="label-mono mb-1">Studio</div>
              <div className="font-display text-17 text-t2">{location}</div>
            </div>
          </div>

          <BookingEmbed />
        </Reveal>

        <Reveal delay={0.08} className="relative">
          <ContactFormPanel email={email} turnstileSiteKey={turnstileSiteKey} />
        </Reveal>
      </div>
    </section>
  );
}
