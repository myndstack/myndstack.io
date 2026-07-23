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
import MobileDrawer from "./MobileDrawer";
import Wordmark from "./Wordmark";

/** A section counts as active once its top is above this line. */
const SPY_LINE_PX = 140;

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  /** Latched morph state; see lib/nav-state.ts for the rules. */
  const morphRef = useRef(INITIAL_NAV_STATE);

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
  // scroll frame and must not re-render the tree.
  useScrollFrame(({ y }) => {
    const nav = navRef.current;
    if (!nav) return;

    const morph = nextNavState(morphRef.current, y);
    morphRef.current = morph;
    const { capsule, tucked } = morph;

    nav.classList.toggle("is-cap", capsule);
    nav.classList.toggle("is-tucked", capsule && tucked);

    // Pick the last section (in document order) whose top has crossed the line.
    // Comparing tops rather than trusting SPY_IDS order matters because the nav
    // lists Work before Services while the page renders Services first.
    let active: string | null = null;
    let lowestCrossed = -Infinity;
    /** The section nearest the top of the document, for the above-everything case. */
    let firstInDocument: string | null = null;
    let highestTop = Infinity;

    for (const id of SPY_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;

      const { top } = el.getBoundingClientRect();
      if (top < highestTop) {
        highestTop = top;
        firstInDocument = id;
      }
      if (top <= SPY_LINE_PX && top > lowestCrossed) {
        lowestCrossed = top;
        active = id;
      }
    }

    // Above every section: fall back to the first one *in document order*, not
    // SPY_IDS[0] — the nav's order is a design choice and doesn't match the page,
    // so keying off it made the highlight change whenever the nav was reordered.
    // On sub-pages nothing is found, so nothing is highlighted.
    if (active === null) active = firstInDocument;

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

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
