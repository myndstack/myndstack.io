import { Fragment } from "react";
import type { ClientLockup } from "@/lib/sanity/queries";
import { getHomepage } from "@/lib/sanity/queries";
import MarqueeTrack from "./MarqueeTrack";

/** One pass of the lockup list. Rendered twice so the -50% loop is seamless. */
function Lockups({ pass, lockups }: { pass: string; lockups: ClientLockup[] }) {
  return (
    <>
      {lockups.map((c) => (
        <Fragment key={`${pass}-${c.name}`}>
          <span className={`px-10 ${c.className}`}>
            {c.dotted ? (
              <>
                helios<span className="text-lime">.</span>ai
              </>
            ) : (
              c.name
            )}
          </span>
          <span className="text-line-3">/</span>
        </Fragment>
      ))}
    </>
  );
}

/** Typographic client lockups on an infinite loop, faded out at both edges. */
export default async function LogoMarquee() {
  const { logoMarqueeHeading, clientLockups } = await getHomepage();

  return (
    <section className="overflow-hidden border-b border-line py-[26px]">
      <div className="mb-[26px] text-center font-mono text-[11.5px] font-bold tracking-[0.16em] text-t5 uppercase">
        {logoMarqueeHeading}
      </div>

      <div className="relative overflow-hidden">
        <MarqueeTrack className="animate-marq-slow flex w-max items-center font-display text-[25px] whitespace-nowrap text-t6">
          <Lockups pass="a" lockups={clientLockups} />
          <Lockups pass="b" lockups={clientLockups} />
        </MarqueeTrack>

        {/* Edge fades, painted in the page background */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[120px] bg-[linear-gradient(90deg,#0A0A0B,transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[120px] bg-[linear-gradient(270deg,#0A0A0B,transparent)]" />
      </div>
    </section>
  );
}
