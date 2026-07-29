import Link from "next/link";

import { getRoles } from "@/lib/sanity/queries";
import Reveal from "./Reveal";

export default async function Careers() {
  const roles = await getRoles();

  return (
    <section id="careers" className="mx-auto mt-[60px] max-w-[1200px] px-5 sm:px-14">
      <Reveal className="clip-angular-34 relative overflow-hidden border border-line bg-surface px-6 py-16 sm:px-14">
        {/* Blueprint grid, brightest at the top-right corner */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-55"
          style={{
            backgroundImage:
              "linear-gradient(#16161a 1px, transparent 1px), linear-gradient(90deg, #16161a 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(circle at 88% 12%, #000, transparent 62%)",
            WebkitMaskImage: "radial-gradient(circle at 88% 12%, #000, transparent 62%)",
          }}
        />

        <div className="relative grid grid-cols-1 items-center gap-12 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="eyebrow mb-[18px] tracking-[0.16em]">Join the studio</div>
            <h2 className="m-0 mb-4 font-display text-[34px] leading-none font-bold tracking-[-0.03em] text-balance sm:text-[48px]">
              Build the stack behind everything.
            </h2>
            <p className="m-0 mb-7 max-w-[440px] text-[17px] leading-[1.55] text-t4">
              We hire engineers who care about the layer beneath the product. Small team,
              real ownership, mission-critical work.
            </p>
            <Link href="/careers" className="btn btn-lime px-6 py-3.5">
              See open roles →
            </Link>
          </div>

          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {roles.map((role) => (
              <li key={role.slug}>
                <Link
                  href={`/careers/${role.slug}`}
                  className="ease-brand group flex items-center justify-between gap-4 border border-line bg-surface-3 px-5 py-4 text-white transition-[border-color,transform] duration-160 hover:translate-x-1 hover:border-lime-edge hover:text-white"
                >
                  <span>
                    <span className="block font-display text-base font-semibold">
                      {role.title}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-t4">
                      {role.meta}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="ease-brand font-mono text-lime transition-transform duration-160 group-hover:translate-x-1"
                  >
                    ▸
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
