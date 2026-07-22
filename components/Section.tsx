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
      className={`relative mx-auto max-w-[1200px] px-5 pt-[88px] pb-12 sm:px-14 ${className}`}
    >
      {scanline ? <Scanline /> : null}
      {children}
    </section>
  );
}
