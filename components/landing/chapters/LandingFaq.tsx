"use client";

import { useId, useState } from "react";

import { FAQ_COPY } from "@/lib/landing/chapters";
import type { Faq as FaqItem } from "@/lib/sanity/queries";

/**
 * §09 — deliberately quiet: a sticky title beside a WAI accordion (buttons
 * with aria-expanded controlling labelled regions; one open at a time). The
 * shared `.disclosure` animates height via grid rows and takes closed answers
 * out of the accessibility tree.
 */
export default function LandingFaq({ faqs }: { readonly faqs: readonly FaqItem[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="faq-ch" aria-labelledby={`${baseId}-title`}>
      <div className="page-col faq-grid">
        <div className="faq-head">
          <p className="chapter-kicker">
            <span className="stamp">§09</span>
            <span>{FAQ_COPY.kicker}</span>
          </p>
          <h2 id={`${baseId}-title`} className="chapter-title faq-title">
            {FAQ_COPY.title}
          </h2>
        </div>

        <ul className="faq-list">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            const panelId = `${baseId}-panel-${i}`;
            const buttonId = `${baseId}-button-${i}`;
            return (
              <li key={faq.q} className="faq-item" data-open={isOpen ? "true" : "false"}>
                <h3 className="faq-q">
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className="faq-n" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="faq-text">{faq.q}</span>
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="disclosure"
                  data-open={isOpen ? "true" : "false"}
                >
                  <div className="disclosure__inner">
                    <p className="faq-a">{faq.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
