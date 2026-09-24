"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import CalInline, { CAL_LINK } from "@/components/CalInline";
import ContactFormPanel from "@/components/ContactFormPanel";
import { CONTACT_COPY } from "@/lib/landing/chapters";

type Props = {
  readonly email: string;
  readonly phone: string;
  readonly phoneHref: string;
  readonly location: string;
  readonly turnstileSiteKey: string;
};

const TABS = [
  { key: "write", label: "Write to us" },
  { key: "book", label: "Book a call" },
] as const;

/**
 * §10 — contact. The form is the default and is server-rendered (Turnstile
 * never mounts hidden). If a Cal.com link is configured, a WAI tablist offers
 * "Book a call": its panel stays mounted once opened (next/script runs a given
 * id once per page) and its third-party script only loads on that first open.
 * No Cal link ⇒ no tabs at all, just the form.
 */
export default function ContactChapter({ email, phone, phoneHref, location, turnstileSiteKey }: Props) {
  const id = useId();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("write");
  const [calOpened, setCalOpened] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasCal = Boolean(CAL_LINK);

  const select = (key: (typeof TABS)[number]["key"]) => {
    setTab(key);
    if (key === "book") setCalOpened(true);
  };

  /** WAI tabs: arrows move between tabs (and select them), wrapping. */
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const j = (i + delta + TABS.length) % TABS.length;
    select(TABS[j].key);
    tabRefs.current[j]?.focus();
  };

  return (
    <section id="contact" className="contact-ch" data-surface="graphite" aria-labelledby={`${id}-title`}>
      <div className="page-col contact-grid">
        <div className="contact-copy">
          <p className="chapter-kicker">
            <span className="stamp">§10</span>
            <span>{CONTACT_COPY.kicker}</span>
          </p>
          <h2 id={`${id}-title`} className="chapter-title contact-title">
            {CONTACT_COPY.title}
          </h2>
          <p className="chapter-lede">{CONTACT_COPY.lede}</p>

          <dl className="contact-facts">
            <div>
              <dt className="hud-k">Email</dt>
              <dd>
                <a href={`mailto:${email}`} className="ulink">
                  {email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="hud-k">Phone</dt>
              <dd>
                <a href={phoneHref} className="ulink">
                  {phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="hud-k">Studio</dt>
              <dd>{location}</dd>
            </div>
          </dl>
        </div>

        <div className="contact-panel">
          {hasCal ? (
            <div role="tablist" aria-label="How to reach us" className="contact-tabs">
              {TABS.map((t, i) => (
                <button
                  key={t.key}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`${id}-tab-${t.key}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  aria-controls={`${id}-panel-${t.key}`}
                  tabIndex={tab === t.key ? 0 : -1}
                  onClick={() => select(t.key)}
                  onKeyDown={(e) => onKey(e, i)}
                  className="contact-tab"
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}

          <div
            id={`${id}-panel-write`}
            role={hasCal ? "tabpanel" : undefined}
            aria-labelledby={hasCal ? `${id}-tab-write` : undefined}
            hidden={hasCal && tab !== "write"}
          >
            <ContactFormPanel email={email} turnstileSiteKey={turnstileSiteKey} />
          </div>

          {hasCal ? (
            <div
              id={`${id}-panel-book`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-book`}
              hidden={tab !== "book"}
              className="contact-cal"
            >
              <p className="contact-cal-note">
                Book 30 minutes with an engineer — not a salesperson. Opens Cal.com; their cookies apply.
              </p>
              {calOpened ? <CalInline /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
