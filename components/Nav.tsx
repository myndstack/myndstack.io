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

  /**
   * The section links, and the last state actually written to them.
   *
   * The frame callback used to re-run `querySelectorAll` and then set a class
   * and an `aria-current` on all six links on *every* scroll frame, whether or
   * not anything had changed — a fresh NodeList plus ~18 DOM operations, 60
   * times a second, right through the morph. (`setAttribute` queues a mutation
   * even when the value is identical, so this was not free.) Caching the
   * elements and diffing against what was last applied means a steady scroll
   * writes nothing at all.
   */
  const linksRef = useRef<HTMLAnchorElement[]>([]);
  const appliedRef = useRef({ capsule: false, tucked: false, active: null as string | null });

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
    // Also where the cache above is refilled — the link set is whatever this
    // route just rendered, and re-reading it here means the frame callback
    // never has to touch the DOM to find them.
    linksRef.current = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>(".navlink[data-section]") ?? [],
    );

    for (const link of linksRef.current) {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    }
    appliedRef.current.active = null;
  }, [pathname]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    burgerRef.current?.focus();
  }, []);

  // Styles are toggled through classes rather than state: this runs every
  // scroll frame and must not re-render the tree. Write-only — every value it
  // needs is either cached above or arrives in the frame state — and every
  // write is gated on having actually changed, so scrolling through unchanged
  // state costs three comparisons and nothing else.
  useScrollFrame(({ y }) => {
    const nav = navRef.current;
    if (!nav) return;

    const morph = nextNavState(morphRef.current, y);
    morphRef.current = morph;

    const applied = appliedRef.current;
    const { capsule } = morph;
    const tucked = capsule && morph.tucked;

    if (capsule !== applied.capsule) {
      applied.capsule = capsule;
      nav.classList.toggle("is-cap", capsule);
    }
    if (tucked !== applied.tucked) {
      applied.tucked = tucked;
      nav.classList.toggle("is-tucked", tucked);
    }

    const active = activeSection(offsetsRef.current, y, SPY_LINE_PX);
    if (active === applied.active) return;
    applied.active = active;

    // Route links carry no section — their active state comes from the URL, and
    // they are not in this list.
    for (const link of linksRef.current) {
      const isActive = link.dataset.section === active;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  });

  return (
    <>
      <nav ref={navRef} className="nav" aria-label="Primary">
        {/* The two morph states, as layers that cross-fade rather than as
            properties of the nav that have to be animated through layout. */}
        <span className="nav-scrim" aria-hidden="true" />
        <span className="nav-pill" aria-hidden="true" />

        <div className="nav-inner">
          <span className="wm-stack">
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
