/* eslint-disable @next/next/no-html-link-for-pages --
   Root-relative fragments like "/#contact" are same-document scrolls on the
   homepage. A native anchor is the right primitive for that; next/link would
   route through the App Router just to move the scroll position. Real route
   changes below still use <Link>. */
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { NAV_LINKS, SITE } from "@/lib/content";
import Wordmark from "./Wordmark";

const FOCUSABLE = "a[href], button:not([disabled])";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Right slide-in menu for ≤760px. Traps focus while open and closes on Esc. */
export default function MobileDrawer({ open, onClose }: Props) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer once it has slid in.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeButtonRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  // Lock the page behind the drawer so scrolling doesn't leak through.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes?.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="ease-brand fixed inset-0 z-119 bg-black/55 transition-opacity duration-300"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />

      <aside
        ref={drawerRef}
        id="mobile-drawer"
        aria-label="Menu"
        inert={!open}
        className="ease-brand fixed inset-y-0 right-0 z-120 flex w-80 max-w-[84vw] flex-col border-l border-line bg-ink px-6 pt-[22px] pb-7 transition-transform duration-[320ms]"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="mb-7 flex items-center justify-between">
          <Wordmark height={20} />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="btn-icon size-[38px] font-mono text-base"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col">
          {/* Exactly the desktop set — the wider surface should never offer less
              navigation than the narrower one. FAQ lives in the footer. */}
          {NAV_LINKS.map((link) =>
            link.section ? (
              <a
                key={link.href}
                className="drawer-link"
                href={link.href}
                onClick={onClose}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                className="drawer-link"
                href={link.href}
                onClick={onClose}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <a
          href="/#contact"
          onClick={onClose}
          className="mt-[26px] bg-lime p-[15px] text-center font-body text-[15px] font-semibold text-lime-ink"
        >
          Start a project →
        </a>
        <a
          href={`mailto:${SITE.email}`}
          className="mt-[18px] font-mono text-xs tracking-[0.04em] text-t5"
        >
          {SITE.email}
        </a>
      </aside>
    </>
  );
}
