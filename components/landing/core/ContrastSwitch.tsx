"use client";

import { useState } from "react";

import CoreRingMini from "./CoreRingMini";

type Props = {
  readonly without: readonly string[];
  readonly with: readonly string[];
};

/**
 * "Typical agency ↔ Myndstack": the same five concerns, answered two ways.
 * Both columns are always in the DOM and readable (no JS: a plain comparison);
 * the switch only moves the emphasis — and the ring beside it, which breaks
 * into gapped, desaturated arcs (the hand-offs) or closes into the spectrum.
 */
export default function ContrastSwitch({ without, with: withUs }: Props) {
  const [ours, setOurs] = useState(true);
  const rows = Math.max(without.length, withUs.length);

  return (
    <div className="contrast" data-state={ours ? "ours" : "agency"}>
      <div className="contrast-head">
        <div className="contrast-ring" aria-hidden="true">
          <CoreRingMini />
        </div>
        <div className="contrast-toggle">
          <span className="contrast-label" data-side="agency">
            Typical agency
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={ours}
            aria-label="Show how Myndstack does it"
            onClick={() => setOurs((v) => !v)}
            className="contrast-switch"
          >
            <span className="contrast-knob" />
          </button>
          <span className="contrast-label" data-side="ours">
            Myndstack
          </span>
        </div>
      </div>

      <table className="contrast-table">
        <thead>
          <tr>
            <th scope="col" data-side="agency">
              Typical agency
            </th>
            <th scope="col" data-side="ours">
              Myndstack
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              <td data-side="agency">{without[i] ?? ""}</td>
              <td data-side="ours">{withUs[i] ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
