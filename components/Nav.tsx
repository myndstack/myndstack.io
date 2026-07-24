/* eslint-disable @next/next/no-html-link-for-pages --
   Root-relative fragments like "/#contact" are same-document scrolls on the
   homepage. A native anchor is the right primitive for that; next/link would
   route through the App Router just to move the scroll position. Links that
   change route use <Link>. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV_LINKS, SPY_IDS } from "@/lib/content";
import { useScrollFrame } from "@/lib/hooks";
import { INITIAL_NAV_STATE, nextNavState } from "@/lib/nav-state";
import { activeSection, type SectionOffset } from "@/lib/scroll-spy";
import MobileDrawer from "./MobileDrawer";
import Wordmark from "./Wordmark";

/** A section counts as active once its top is above this line. */
const SPY_LINE_PX = 140;

export default function Nav({ contactEmail }: { contactEmail: string }) {
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  /** Latched morph state; see lib/nav-state.ts for the rules. */
  const morphRef = useRef(INITIAL_NAV_STATE);

  /**
   * Where each spied section sits in the document. Cached, because measuring it
   * per frame meant a `getBoundingClientRect()` per section interleaved with
   * this component's own class writes — a forced synchronous layout each time.
   * Offsets are scroll-independent, so they only need refreshing when layout
   * actually moves.
   */
  const offsetsRef = useRef<SectionOffset[]>([]);

  useEffect(() => {
    let pending = 0;

    const measure = () => {
      pending = 0;
      offsetsRef.current = SPY_IDS.flatMap((id) => {
        const el = document.getElementById(id);
        return el ? [{ id, top: el.offsetTop }] : [];
      });
    };

    /** Layout can settle in bursts; one measurement per frame is plenty. */
    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(measure);
    };

    measure();

    // Font swap shifts every section on the page.
    document.fonts?.ready.then(schedule);

    // Anything else that moves content: reveals landing, the loader clearing,
    // a viewport resize, an accordion opening above a spied section.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      if (pending) cancelAnimationFrame(pending);
    };
    // Sections differ per route, so re-measure whenever the route does.
  }, [pathname]);

  /**
   * Scroll-spy state is stale after a client-side route change: this component
   * lives in the layout so it never remounts, and no scroll event fires on
   * navigation — leaving whichever section was active on the homepage still
   * highlighted on /careers.
   */
  useEffect(() => {
    listRef.current
      ?.querySelectorAll<HTMLAnchorElement>(".navlink[data-section]")
      .forEach((link) => {
        link.classList.remove("is-active");
        link.removeAttribute("aria-current");
      });
  }, [pathname]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    burgerRef.current?.focus();
  }, []);

  // Styles are toggled through classes rather than state: this runs every
  // scroll frame and must not re-render the tree. Write-only — every value it
  // needs is either cached above or arrives in the frame state.
  useScrollFrame(({ y }) => {
    const nav = navRef.current;
    if (!nav) return;

    const morph = nextNavState(morphRef.current, y);
    morphRef.current = morph;
    const { capsule, tucked } = morph;

    nav.classList.toggle("is-cap", capsule);
    nav.classList.toggle("is-tucked", capsule && tucked);

    const active = activeSection(offsetsRef.current, y, SPY_LINE_PX);

    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>(".navlink");
    links?.forEach((link) => {
      // Route links carry no section — their active state comes from the URL.
      if (!link.dataset.section) return;
      const isActive = active !== null && link.dataset.section === active;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  });

  return (
    <>
      <nav ref={navRef} className="nav" aria-label="Primary">
        <div className="nav-inner">
          <span className="flex items-center">
            <Wordmark variant="white" className="wm-white" />
            <Wordmark variant="black" className="wm-black" />
          </span>

          <ul ref={listRef} className="m-0 hidden list-none gap-[26px] p-0 sm:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                {link.section ? (
                  <a className="navlink" href={link.href} data-section={link.section}>
                    {link.label}
                  </a>
                ) : (
                  <Link
                    className={`navlink${pathname === link.href ? " is-active" : ""}`}
                    href={link.href}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <a className="nav-cta hidden sm:inline-block" href="/#contact">
            Start a project
          </a>

          <button
            ref={burgerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            className="btn-icon flex size-11 flex-col items-center justify-center gap-[5px] sm:hidden"
          >
            <span className="block h-0.5 w-[18px] bg-white" />
            <span className="block h-0.5 w-[18px] bg-white" />
            <span className="block h-0.5 w-[18px] bg-white" />
          </button>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} contactEmail={contactEmail} />
    </>
  );
}
