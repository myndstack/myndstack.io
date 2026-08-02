import Link from "next/link";

import { FOOTER_COLUMNS, LEGAL_LINKS } from "@/lib/content";
import type { SiteSettings } from "@/lib/sanity/queries";
import Newsletter from "./Newsletter";
import SocialIcon from "./SocialIcon";
import StatusPulse from "./StatusPulse";
import Wordmark from "./Wordmark";

const colHeadClass =
  "m-0 mb-3.5 font-mono text-[11px] font-normal tracking-[0.14em] text-t5 uppercase";
const linkClass =
  "ease-brand text-[14px] text-t3 transition-colors duration-160 hover:text-lime";

export default function Footer({ site }: { site: SiteSettings }) {
  const { socials } = site;
  const activeSocials = socials.filter((s) => s.href);

  return (
    <footer className="mt-[88px] border-t border-line px-5 pt-16 pb-10 sm:px-14">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 xs:grid-cols-2 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] md:gap-12">
        {/* Brand block — wordmark, tagline, newsletter, contact, socials. Absorbs
            what used to be a separate "Connect" column so the right side stays
            three lean nav columns and the whole footer breathes at md+. */}
        <div className="flex flex-col gap-6">
          <div>
            <Wordmark height={24} className="mb-4" />
            <p className="m-0 max-w-[320px] text-[14px] leading-[1.55] text-t4">
              Enterprise AI &amp; cognitive infrastructure for mission-critical
              software. One stack. Every layer.
            </p>
          </div>

          <div className="max-w-[360px]">
            <div className={colHeadClass}>Newsletter</div>
            <Newsletter />
          </div>

          {/* Socials shown at ≤lg only. Contact details (email/phone/location)
              live on the /#contact block and in the mobile nav; footer stays
              lean. Above lg the desktop spine already carries these profiles,
              so the row is hidden to avoid duplication. Each button is a 44×44
              hit area (WCAG 2.5.8); -ml-2.5 aligns the first icon with the
              text above. */}
          {activeSocials.length > 0 && (
            <div className="-ml-2.5 flex items-center lg:hidden">
              {activeSocials.map((s) => (
                <a
                  key={s.label}
                  href={s.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="ease-brand inline-flex size-11 items-center justify-center text-t4 transition-colors duration-160 hover:text-lime"
                >
                  <SocialIcon name={s.label} />
                </a>
              ))}
            </div>
          )}
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className={colHeadClass}>{column.title}</h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 max-w-[1200px] border-t border-surface-3 pt-6">
        <div className="flex flex-col-reverse items-start gap-4 text-[12.5px] text-t5 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex items-center gap-4">
            <StatusPulse />
            <span className="whitespace-nowrap">
              © 2026 Myndstack. Intelligence, engineered.
            </span>
          </div>
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[12.5px] text-t5 transition-colors duration-160 hover:text-lime"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="font-mono whitespace-nowrap">{site.version}</span>
        </div>
      </div>
    </footer>
  );
}
