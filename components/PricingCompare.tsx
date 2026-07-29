"use client";

import { useRef, useState } from "react";
import type { CompareValue, PricingTier } from "@/lib/content";
import { PRICING_COMPARISON } from "@/lib/content";

type Props = {
  /** Tier names to show as columns, in display order. */
  tierNames: string[];
  /**
   * Best-effort analytics hook — fires with `pricing_compare_opened` the first
   * time the table opens per session. Silent no-op if omitted or if the
   * caller's analytics client isn't loaded.
   */
  onOpen?: () => void;
};

/**
 * Expandable "Compare all plans" table.
 *
 * State-driven toggle (not <details>) so the reveal is under our control and
 * the same trigger button label can flip. Table wraps in an overflow-x-auto
 * container so it scrolls horizontally on mobile without breaking the page.
 *
 * Print behaviour: the wrapper carries `print:!block` + we force the table
 * open when printed so procurement can PDF a comparison sheet without having
 * to click first.
 */
export default function PricingCompare({ tierNames, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const reportedOpen = useRef(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !reportedOpen.current) {
      reportedOpen.current = true;
      onOpen?.();
    }
  };

  return (
    <div className="mt-12">
      <div className="flex justify-center print:hidden">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="pricing-compare-table"
          className="btn-outline px-6 py-2.5 text-[13.5px] font-semibold"
        >
          {open ? "Hide comparison" : "Compare all plans →"}
        </button>
      </div>

      <div
        id="pricing-compare-table"
        // Force the table visible when printed regardless of open state.
        className={`${open ? "mt-10 block" : "hidden"} print:!mt-10 print:!block`}
      >
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface-3">
                <th
                  scope="col"
                  className="p-4 text-[12px] font-normal tracking-[0.12em] text-t5 uppercase"
                >
                  Feature
                </th>
                {tierNames.map((name) => (
                  <th
                    key={name}
                    scope="col"
                    className="p-4 text-center font-display text-[15px] font-semibold text-t2"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRICING_COMPARISON.map((section) => (
                <CompareSectionRows
                  key={section.title}
                  title={section.title}
                  rows={section.rows}
                  tierNames={tierNames}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareSectionRows({
  title,
  rows,
  tierNames,
}: {
  title: string;
  rows: (typeof PRICING_COMPARISON)[number]["rows"];
  tierNames: string[];
}) {
  return (
    <>
      <tr className="border-t border-line bg-surface">
        <th
          scope="colgroup"
          colSpan={tierNames.length + 1}
          className="p-4 font-mono text-[11px] tracking-[0.14em] text-t5 uppercase"
        >
          {title}
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.label} className="border-t border-line">
          <th
            scope="row"
            className="p-4 text-left text-[14px] font-normal text-t3"
          >
            {row.label}
            {row.hint ? (
              <span className="mt-1 block text-[12px] text-t5">{row.hint}</span>
            ) : null}
          </th>
          {tierNames.map((name) => (
            <td
              key={name}
              className="p-4 text-center text-[13.5px] text-t3 align-middle"
            >
              <CellValue value={row.values[name]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CellValue({ value }: { value: CompareValue | undefined }) {
  if (value === true) {
    return (
      <span aria-label="Included" className="inline-flex text-lime">
        {/* Small check-in-a-square glyph. SVG stays inline so print's
            forced-black text style doesn't strip the accent. */}
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path
            d="M4 8.5 7 11.5 12.5 5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </span>
    );
  }
  if (value === false || value === undefined) {
    return (
      <span aria-label="Not included" className="text-t6">
        —
      </span>
    );
  }
  return <span>{value}</span>;
}

/**
 * Convenience: derives the tier-name column list from a resolved tier list.
 * Kept as a named export so <Pricing> doesn't need to reach into ResolvedTier
 * shape twice.
 */
export const tierNamesOf = (tiers: PricingTier[]): string[] =>
  tiers.map((t) => t.name);
