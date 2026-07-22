import Link from "next/link";

import { FOOTER_COLUMNS, LEGAL_LINKS, SITE } from "@/lib/content";
import Newsletter from "./Newsletter";
import Wordmark from "./Wordmark";

export default function Footer() {
  return (
    <footer className="mt-[88px] border-t border-line px-5 pt-14 pb-10 sm:px-14">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 xs:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Wordmark height={24} className="mb-4" />
          <p className="m-0 mb-6 max-w-[280px] text-sm leading-[1.55] text-t5">
            Enterprise AI &amp; cognitive infrastructure for mission-critical software.
            One stack. Every layer.
          </p>
          <div className="label-mono mb-2.5">Newsletter</div>
          <Newsletter />
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="m-0 mb-3.5 font-mono text-[11.5px] font-normal tracking-[0.12em] text-t5 uppercase">
              {column.title}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-[11px] p-0">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[14.5px] text-t3 hover:text-lime">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="m-0 mb-3.5 font-mono text-[11.5px] font-normal tracking-[0.12em] text-t5 uppercase">
            Connect
          </h2>
          <ul className="m-0 flex list-none flex-col gap-[11px] p-0">
            <li>
              <a
                href={`mailto:${SITE.email}`}
                className="text-[14.5px] text-t3 hover:text-lime"
              >
                {SITE.email}
              </a>
            </li>
            <li>
              <a href={SITE.phoneHref} className="text-[14.5px] text-t3 hover:text-lime">
                {SITE.phone}
              </a>
            </li>
            <li>
              <span className="text-[14.5px] text-t5">{SITE.location}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-[1200px] flex-wrap items-center justify-between gap-5 border-t border-surface-3 pt-6 text-[13px] text-t5">
        <span>© 2026 Myndstack. Intelligence, engineered.</span>
        <div className="flex items-center gap-[22px]">
          {LEGAL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] text-t5 hover:text-lime"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <span className="font-mono">{SITE.version}</span>
      </div>
    </footer>
  );
}
