"use client";

import { useId, useState } from "react";
import type { Faq as FaqItem } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Scanline from "./Scanline";
import SectionHeader from "./SectionHeader";

/** Accordion with one panel open at a time. */
export default function Faq({ faqs }: { faqs: FaqItem[] }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="relative mx-auto max-w-[900px] px-5 pt-[88px] pb-12 sm:px-14"
    >
      <Scanline />
      <SectionHeader
        className="mb-11"
        align="center"
        eyebrow="Questions"
        title="Frequently asked."
      />

      <Reveal className="flex flex-col gap-3">
        {faqs.map((faq, i) => {
          const open = openIndex === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;

          return (
            <div
              key={faq.q}
              className={`ease-brand border border-line transition-colors duration-160 ${open ? "bg-surface-3" : "bg-transparent"}`}
            >
              <h3 className="m-0">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-5 border-none bg-transparent px-6 py-[22px] text-left"
                >
                  <span className="font-display text-lg font-semibold text-white">
                    {faq.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ease-brand flex-none font-mono text-[22px] text-lime transition-transform duration-200"
                    style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    +
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                // grid-rows 0fr→1fr animates to the panel's natural height without
                // measuring scrollHeight by hand.
                className="ease-brand grid transition-[grid-template-rows] duration-300"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="m-0 max-w-[640px] px-6 pb-6 text-[15.5px] leading-[1.6] text-t4">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}
