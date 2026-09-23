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
      <div className="page-column relative z-[1] pt-[calc(72px+var(--nav-height))] pb-14">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="animate-rise-in mb-8">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 font-mono text-11 tracking-[0.1em] text-t5 uppercase">
              {breadcrumbs.map((crumb) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  <Link
                    href={crumb.href}
                    className="ease-brand text-t5 transition-colors duration-(--dur-fast) hover:text-t2"
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

        <div className="eyebrow animate-rise-in mb-4 [animation-delay:60ms]">
          {eyebrow}
        </div>
        <h1 className="animate-rise-in m-0 max-w-[880px] font-display text-30 leading-display font-bold tracking-[-0.03em] text-balance sm:text-56 [animation-delay:120ms]">
          {title}
        </h1>
        {lede ? (
          <p className="animate-rise-in mt-5 mb-0 max-w-[620px] text-17 leading-body text-t4 [animation-delay:180ms]">
            {lede}
          </p>
        ) : null}
        {meta ? (
          <p className="animate-rise-in mt-6 mb-0 font-mono text-11 tracking-[0.1em] text-t5 uppercase [animation-delay:240ms]">
            {meta}
          </p>
        ) : null}
      </div>
    </header>
  );
}
