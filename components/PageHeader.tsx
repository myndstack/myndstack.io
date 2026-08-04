import Link from "next/link";
import type { ReactNode } from "react";

type Crumb = { label: string; href: string };

/** Masthead for sub-pages — the homepage uses the full-bleed Hero instead. */
export default function PageHeader({
  eyebrow,
  title,
  lede,
  meta,
  breadcrumbs,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  /** Small print under the lede, e.g. a last-updated date. */
  meta?: string;
  breadcrumbs?: Crumb[];
}) {
  return (
    <header className="masthead border-b border-line">
      <div className="relative z-[1] mx-auto max-w-[1200px] px-5 pt-[calc(72px+var(--nav-height))] pb-14 sm:px-14">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="animate-rise-in mb-8">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 font-mono text-[11px] tracking-[0.1em] text-t5 uppercase">
              {breadcrumbs.map((crumb) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  <Link
                    href={crumb.href}
                    className="ease-brand text-t5 transition-colors duration-160 hover:text-t2"
                  >
                    {crumb.label}
                  </Link>
                  <span aria-hidden="true" className="text-line-3">
                    /
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="eyebrow animate-rise-in mb-3.5 [animation-duration:0.7s]">
          {eyebrow}
        </div>
        <h1 className="animate-rise-in m-0 max-w-[880px] font-display text-[34px] leading-[1.02] font-bold tracking-[-0.03em] text-balance sm:text-[56px] [animation-duration:0.8s]">
          {title}
        </h1>
        {lede ? (
          <p className="animate-rise-in mt-5 mb-0 max-w-[620px] text-[17px] leading-[1.55] text-t4 [animation-duration:0.9s]">
            {lede}
          </p>
        ) : null}
        {meta ? (
          <p className="animate-rise-in mt-6 mb-0 font-mono text-[11px] tracking-[0.1em] text-t5 uppercase [animation-duration:1s]">
            {meta}
          </p>
        ) : null}
      </div>
    </header>
  );
}
