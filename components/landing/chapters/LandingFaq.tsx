"use client";

import { useId, useState } from "react";

import { FAQ_COPY } from "@/lib/landing/chapters";
import { engineSignals } from "@/lib/landing/engine/store";
import type { Faq as FaqItem } from "@/lib/sanity/queries";

import { DialPoster } from "../engine/Dial";
import { Kicker, Title } from "../type/Type";

/**
 * §09 — notes: paper, quiet. A sticky title and a small dial beside a WAI
 * accordion (buttons with aria-expanded controlling labelled regions; one
 * open at a time). The dial's playhead points at the open question.
 */
export default function LandingFaq({ faqs }: { readonly faqs: readonly FaqItem[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="sheet sheet--faq" data-skin="drafting" data-accent="lime" aria-labelledby={`${baseId}-title`}>
      <div className="ms-grid faq-grid">
        <div className="faq-head">
          <Kicker n="§09">{FAQ_COPY.kicker}</Kicker>
          <Title id={`${baseId}-title`} lines={[FAQ_COPY.title]} />
          <div className="faq-dial" data-open={open ?? -1} aria-hidden="true">
            <DialPoster id="faq-dial">
              <svg className="faq-playhead" viewBox="0 0 1000 1000" focusable="false">
                <path d="M500 18L516 -8H484Z" />
              </svg>
            </DialPoster>
          </div>
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
                    onClick={() => {
                      const next = isOpen ? null : i;
                      setOpen(next);
                      engineSignals.set("faq.open", next ?? -1);
                    }}
                  >
                    <span className="faq-n t-mono-10" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="faq-text t-title-s">{faq.q}</span>
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} className="disclosure" data-open={isOpen ? "true" : "false"}>
                  <div className="disclosure__inner">
                    <p className="t-body faq-a">{faq.a}</p>
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
