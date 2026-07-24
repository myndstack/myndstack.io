"use client";

import { useState } from "react";
import type { PricingTier } from "@/lib/content";
import Reveal from "./Reveal";
import Section from "./Section";
import SectionHeader from "./SectionHeader";

type Billing = "monthly" | "annual";

export default function Pricing({ tiers }: { tiers: PricingTier[] }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const annual = billing === "annual";

  return (
    <Section id="pricing">
      <SectionHeader
        className="mb-12"
        align="center"
        eyebrow="Engagement models"
        title="Pricing that scales with the stack."
        lede="Start on the platform, or bring us in to build. Transparent tiers, no glue-code tax."
      />

      <Reveal className="mb-[34px] flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex border border-line-3 bg-surface"
        >
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            aria-pressed={!annual}
            className={`bill-btn${!annual ? " is-on" : ""}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            aria-pressed={annual}
            className={`bill-btn${annual ? " is-on" : ""}`}
          >
            Annual · save 2 mo
          </button>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 items-start gap-[18px] sm:grid-cols-3">
        {tiers.map((tier, i) => {
          const price = annual && tier.annualPrice ? tier.annualPrice : tier.price;

          return (
            <Reveal key={tier.name} delay={i * 0.08}>
              <div
                className={
                  tier.highlighted
                    ? "relative h-full border border-lime bg-surface-3 p-[30px] shadow-[0_0_0_1px_#C9F24D,0_20px_50px_rgba(0,0,0,.5)]"
                    : "card h-full p-[30px] hover:border-lime-edge"
                }
              >
                {tier.badge ? (
                  <div className="absolute top-5 right-5 bg-lime px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.12em] text-lime-ink uppercase">
                    {tier.badge}
                  </div>
                ) : null}

                <div className="mb-1.5 font-display text-[19px] font-semibold">
                  {tier.name}
                </div>
                <div className="mb-[22px] text-[13.5px] text-t4">{tier.blurb}</div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[clamp(34px,5vw,46px)] font-bold tracking-[-0.02em]">
                      {price}
                    </span>
                    {tier.period ? (
                      <span className="text-sm text-t5">{tier.period}</span>
                    ) : null}
                  </div>
                  {/* Reserved height so switching billing doesn't shift the card. */}
                  {tier.annualNote ? (
                    <div className="mt-[7px] h-3.5 font-mono text-[11px] tracking-[0.04em] text-lime">
                      {annual ? tier.annualNote : ""}
                    </div>
                  ) : null}
                </div>

                <a
                  href="#contact"
                  className={
                    tier.highlighted
                      ? "mb-6 block bg-lime p-3 text-center text-[15px] font-semibold text-lime-ink transition-colors hover:bg-lime-hover hover:text-lime-ink"
                      : "btn-outline mb-6 block p-3 text-center text-[15px] font-semibold"
                  }
                >
                  {tier.cta}
                </a>

                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex gap-2.5 text-[14.5px] ${tier.highlighted ? "text-t2" : "text-t3"}`}
                    >
                      <span className="text-lime">▸</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
