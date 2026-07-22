import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found — Myndstack",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[1200px] flex-col items-start justify-center px-5 pt-[calc(88px+var(--nav-height))] pb-[88px] sm:px-14">
      <div className="eyebrow mb-3.5">Error · 404</div>
      <h1 className="m-0 mb-4 font-display text-[42px] leading-none font-bold tracking-[-0.03em] text-balance sm:text-[76px]">
        This layer
        <br />
        <span className="text-lime">doesn&rsquo;t exist.</span>
      </h1>
      <p className="m-0 mb-9 max-w-[440px] text-[17px] leading-[1.55] text-t4">
        The page you&rsquo;re looking for isn&rsquo;t part of the stack. Head back to the
        top, or tell us what you were after.
      </p>
      <div className="flex flex-wrap gap-3.5">
        <Link href="/" className="btn btn-lime">
          Back to home →
        </Link>
        <Link href="/#contact" className="btn btn-outline">
          Get in touch ▸
        </Link>
      </div>
    </section>
  );
}
