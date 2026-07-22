import { Fragment } from "react";
import { CLIENT_LOCKUPS } from "@/lib/content";

/** One pass of the lockup list. Rendered twice so the -50% loop is seamless. */
function Lockups({ pass }: { pass: string }) {
  return (
    <>
      {CLIENT_LOCKUPS.map((c) => (
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
export default function LogoMarquee() {
  return (
    <section className="overflow-hidden border-b border-line py-[26px]">
      <div className="mb-[26px] text-center font-mono text-[11.5px] font-bold tracking-[0.16em] text-t5 uppercase">
        Trusted by 120+ engineering teams building at scale
      </div>

      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="animate-marq-slow flex w-max items-center font-display text-[25px] whitespace-nowrap text-t6"
        >
          <Lockups pass="a" />
          <Lockups pass="b" />
        </div>

        {/* Edge fades, painted in the page background */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[120px] bg-[linear-gradient(90deg,#0A0A0B,transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[120px] bg-[linear-gradient(270deg,#0A0A0B,transparent)]" />
      </div>
    </section>
  );
}
