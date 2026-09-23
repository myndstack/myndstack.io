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
          <nav aria-label="Breadcrumb" className="entrance mb-8">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 font-mono text-11 tracking-label text-t5 uppercase">
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

        <div className="eyebrow entrance mb-4 [--entrance-step:60ms]">
          {eyebrow}
        </div>
        <h1 className="entrance m-0 max-w-[880px] font-display text-30 leading-display font-bold tracking-display text-balance sm:text-56 [--entrance-step:120ms]">
          {title}
        </h1>
        {lede ? (
          <p className="entrance mt-5 mb-0 max-w-[620px] text-17 leading-body text-t4 [--entrance-step:180ms]">
            {lede}
          </p>
        ) : null}
        {meta ? (
          <p className="entrance mt-6 mb-0 font-mono text-11 tracking-label text-t5 uppercase [--entrance-step:240ms]">
            {meta}
          </p>
        ) : null}
      </div>
    </header>
  );
}
