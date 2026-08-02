import type { ReactNode } from "react";
import Scanline from "./Scanline";

/** Standard content column: 1200px max, 56px gutter (20px on mobile), 88/48 rhythm. */
export default function Section({
  id,
  className = "",
  children,
  scanline = true,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  /** Set false where the sweep would land on a filled panel and be invisible. */
  scanline?: boolean;
}) {
  return (
    <section
      id={id}
      // Anchor targets are made programmatically focusable so a hash-nav click
      // moves focus (and the SR reading cursor) into the section; -1 keeps them
      // out of the tab order, and the ring is suppressed since the only focus
      // here is programmatic.
      tabIndex={id ? -1 : undefined}
      className={`relative mx-auto max-w-[1200px] px-5 pt-[88px] pb-12 sm:px-14${
        id ? " focus:outline-none" : ""
      } ${className}`}
    >
      {scanline ? <Scanline /> : null}
      {children}
    </section>
  );
}
