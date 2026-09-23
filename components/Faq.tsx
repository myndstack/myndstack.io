"use client";

import { useId, useState } from "react";
import type { Faq as FaqItem } from "@/lib/sanity/queries";
import Reveal from "./Reveal";
import Scanline from "./Scanline";
import SectionHeader from "./SectionHeader";
import Icon from "./Icon";

/** Accordion with one panel open at a time. */
export default function Faq({ faqs }: { faqs: FaqItem[] }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // No questions in the CMS → no section, rather than a header over nothing.
  if (faqs.length === 0) return null;

  return (
    <section
      id="faq"
      className="relative mx-auto max-w-[900px] px-5 pt-22 pb-12 sm:px-14"
    >
      <Scanline />
      <SectionHeader
        className="mb-11"
        align="center"
        eyebrow="Questions"
        title="Before you get in touch."
      />

      {/*
        A <ul>/<li> pair, not bare <div>s: screen readers announce this as
        "list, N items" and let the user step through them with list-nav
        commands. The visible design is the standard WAI accordion — buttons
        with aria-expanded and per-panel region — and the list wrapping adds a
        landmark on top of that rather than replacing anything.
      */}
      <Reveal>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {faqs.map((faq, i) => {
          const open = openIndex === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;

          return (
            <li
              key={faq.q}
              // Open state lifts: the fill lightens AND a lit top edge
              // (--edge-lip) reads it as a raised plane, same language as the
              // masthead/footer seams. box-shadow joins the transition so the
              // lip fades with the fill — no new motion, just the existing toggle.
              className={`ease-brand border border-line transition-[background-color,box-shadow] duration-(--dur-fast) ${open ? "bg-surface-3 shadow-[var(--edge-lip)]" : "bg-transparent"}`}
            >
              <h3 className="m-0">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-5 border-none bg-transparent px-6 py-6 text-left"
                >
                  <span className="font-display text-17 font-semibold text-t1">
                    {faq.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ease-brand flex-none text-lime transition-transform duration-(--dur-fast)"
                    style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
                  >
                    <Icon name="plus" className="size-5" />
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                // The shared .disclosure: height animates via grid rows, and a
                // closed answer is visibility:hidden — out of the a11y tree, not
                // merely clipped (screen readers used to read every answer).
                className="disclosure"
                data-open={open ? "true" : "false"}
              >
                <div className="disclosure__inner">
                  <p className="m-0 max-w-[640px] px-6 pb-6 text-15 leading-body text-t4">
                    {faq.a}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
        </ul>
      </Reveal>
    </section>
  );
}
