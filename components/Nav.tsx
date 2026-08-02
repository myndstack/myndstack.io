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

/** Fallback spy line if `--nav-offset` can't be read; overridden each measure. */
const SPY_LINE_FALLBACK = 96;

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
   * The spy ACTIVATION line, in px from the top of the viewport — read from the
   * shared `--nav-offset` token. Sections land flush (scroll-padding-top: 0) and
   * clear the nav with their own top padding; a clicked section lands at the very
   * top, still within this line, so it is highlighted. Cached in `measure()`,
   * never read per frame.
   */
  const spyLineRef = useRef(SPY_LINE_FALLBACK);

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
      // Read --nav-offset (the spy activation line) once here, not per frame.
      const offset = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--nav-offset"),
      );
      if (!Number.isNaN(offset)) spyLineRef.current = offset;

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
      // Keep a link that is current-by-URL (e.g. Customers on /work): its active
      // state is render-driven, not spy-driven, so the reset must not strip it.
      if (link.getAttribute("href") === pathname) continue;
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

    // No spy targets on this route (every sub-page) — highlighting is left to the
    // URL (render-driven route-active), so the frame never clears it here.
    if (offsetsRef.current.length === 0) return;

    const active = activeSection(offsetsRef.current, y, spyLineRef.current);
    if (active === applied.active) return;
    applied.active = active;

    for (const link of linksRef.current) {
      // A link that is current-by-URL owns its own active state; the spy must not
      // fight it (matters where a route and a spy section coexist — Customers).
      if (link.getAttribute("href") === pathname) continue;
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
            {NAV_LINKS.map((link) => {
              // Same-doc hash → native <a>; a real path → <Link>. A link can be a
              // route AND carry a spy section (Customers → /work + work-cases): it
              // routes on click yet the frame lights it while its homepage chapter
              // is in view.
              const isAnchor = link.href.startsWith("/#");
              const routeActive = !isAnchor && pathname === link.href;
              return (
                <li key={link.href}>
                  {isAnchor ? (
                    <a className="navlink" href={link.href} data-section={link.section}>
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      className={`navlink${routeActive ? " is-active" : ""}`}
                      href={link.href}
                      data-section={link.section}
                      aria-current={routeActive ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {/* "Contact" (not "Start a project") keeps the pill within its tight
              width budget once the longer enterprise labels are in the row; the
              expansive mobile drawer keeps the fuller CTA. */}
          <a className="nav-cta hidden sm:inline-block" href="/#contact">
            Contact
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
