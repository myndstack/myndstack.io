"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Slide-to-pay: a real <button> that can ALSO be dragged.
 *
 * The gesture is an enhancement, never the only path. Click and Enter/Space
 * confirm exactly as a plain button would — a drag-only control cannot be
 * operated by a keyboard or a screen reader, which would mean some people
 * simply could not pay, and dragging with a mouse is worse than clicking on
 * desktop. So: one native button, an accessible name, and a gesture on top.
 *
 * Two rules here deliberately depart from the usual drag playbook, because the
 * thing on the other side is a charge rather than a dismissal:
 *
 *  - **No velocity shortcut.** A flick that would dismiss a toast must not
 *    commit a payment. The knob has to actually reach the end. Dismissal is
 *    recoverable; money is not.
 *  - **A drag that ends short suppresses the click.** Without this, releasing
 *    at 20% would fall through to the button's own click handler and charge
 *    the buyer anyway — the exact opposite of what letting go means.
 *
 * Nothing here calls setState during the drag. Progress is written straight to
 * the knob's and the trail's `transform`, matching the repo's rule for the
 * scroll loop and keeping the whole gesture off React's render path.
 */

type Props = {
  /** The button's accessible name and resting label, e.g. "Pay £459". */
  readonly label: string;
  /** Shown instead of `label` while the payment is in flight. */
  readonly busyLabel: string;
  readonly busy: boolean;
  readonly onConfirm: () => void;
  /**
   * Id of the element stating the amount. The visible label deliberately does
   * NOT repeat the total — it sits twenty pixels above in 29px type — but a
   * screen reader user can tab straight here without passing it, so the amount
   * rides along as the description instead of the name. Announces as
   * "Slide to pay, Total due £459".
   */
  readonly describedBy?: string;
};

/** How far along the track the knob must get before a release commits. */
const COMMIT_AT = 0.92;
/** Movement beyond this many px is a drag, not a click. */
const DRAG_SLOP = 4;

export default function SlideToPay({
  label,
  busyLabel,
  busy,
  onConfirm,
  describedBy,
}: Props) {
  const trackRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  // Drag bookkeeping. Refs, not state — none of it should render.
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const travel = useRef(0);
  const progress = useRef(0);
  const moved = useRef(false);

  /** Paint a 0..1 position. The only thing the drag ever writes. */
  const paint = useCallback((p: number) => {
    progress.current = p;
    const track = trackRef.current;
    if (knobRef.current) {
      knobRef.current.style.transform = `translateX(${p * travel.current}px)`;
    }
    if (fillRef.current) {
      // Slid, not scaled — see `.slide-fill`. Scaling would flatten the slant
      // on its leading edge as the bar grew, so the trail would stop being
      // parallel to the knob sitting on it.
      //
      // Driven by the SAME `travel` in the same pixels as the knob above, which
      // is what welds the two into one shape: the fill's box is knob+travel
      // wide, so at every p their right edges land on the same x. A percentage
      // here would advance the fill at the track's width instead, and the trail
      // would drift away from the nose it is supposed to be attached to.
      fillRef.current.style.transform = `translateX(${(p - 1) * travel.current}px)`;
    }
    // An attribute, not a class list, so the label flip is one declarative rule.
    // Written only when it changes: setAttribute queues a mutation record even
    // when the value is identical.
    if (track) {
      const past = p > 0.5 ? "true" : "false";
      if (track.dataset.pastHalf !== past) track.dataset.pastHalf = past;
    }
  }, []);

  const settle = useCallback(
    (to: number) => {
      trackRef.current?.classList.remove("is-dragging");
      paint(to);
    },
    [paint],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const track = trackRef.current;
      const knob = knobRef.current;
      if (!track || !knob || busy) return;
      // Multi-touch protection: once a drag owns this control, later pointers
      // are ignored. Without it, a second finger teleports the knob.
      if (pointerId.current !== null) return;

      pointerId.current = e.pointerId;
      startX.current = e.clientX;
      moved.current = false;
      track.classList.add("is-dragging");
      // Keeps the drag alive when the pointer leaves the track.
      track.setPointerCapture(e.pointerId);
    },
    [busy],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerId.current !== e.pointerId || travel.current === 0) return;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > DRAG_SLOP) moved.current = true;
      // Clamped rather than damped: past the end there is nowhere further to
      // go, and rubber-banding a confirm control invites overshooting it.
      paint(Math.min(1, Math.max(0, dx / travel.current)));
    },
    [paint],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (pointerId.current !== e.pointerId) return;
      pointerId.current = null;
      trackRef.current?.releasePointerCapture?.(e.pointerId);

      const reached = progress.current >= COMMIT_AT;
      if (!moved.current) {
        // A press that never moved is a click; let onClick handle it so mouse
        // and keyboard take exactly the same path.
        settle(0);
        return;
      }
      if (reached) {
        settle(1);
        onConfirm();
      } else {
        settle(0);
      }
    },
    [onConfirm, settle],
  );

  const onClick = useCallback(() => {
    // Suppressed after a real drag — releasing short means "no".
    if (moved.current) {
      moved.current = false;
      return;
    }
    onConfirm();
  }, [onConfirm]);

  /**
   * The track's usable travel, cached and refreshed from a ResizeObserver —
   * never read inside the drag, where a layout read would be a forced reflow
   * every pointermove. Same rule the scroll subscribers follow.
   *
   * Measuring here rather than on pointerdown fixes two things that pointerdown
   * alone cannot: the knob has a real travel BEFORE anyone drags (a click or an
   * Enter press fills the bar, and with travel still 0 the knob would sit at
   * the left while the fill ran to the end), and a resize or an orientation
   * change re-places it instead of leaving it painted against the old width.
   */
  useEffect(() => {
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return;

    const measure = () => {
      travel.current = Math.max(
        0,
        track.clientWidth - knob.offsetWidth - 8 /* the knob's 4px insets */,
      );
      // Re-place at whatever progress is current, against the new width.
      if (pointerId.current === null) paint(progress.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [paint]);

  /**
   * Last-resort release. `pointerup` and `pointercancel` cover the ordinary
   * paths, but a window blur or a tab switch mid-drag can swallow both — and
   * what is left behind is a payment control frozen with a half-filled bar and
   * the knob stranded, which looks like a charge in progress that is not.
   * Cheap to guard, and the failure it prevents is alarming rather than subtle.
   */
  useEffect(() => {
    const release = () => {
      if (pointerId.current === null) return;
      pointerId.current = null;
      moved.current = false;
      settle(0);
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [settle]);

  // Keep the paint honest when the status changes underneath us: filled while
  // in flight, and back to the start when the Razorpay modal is dismissed.
  useEffect(() => {
    if (busy) {
      settle(1);
      return;
    }
    if (pointerId.current === null) settle(0);
  }, [busy, settle]);

  return (
    <button
      ref={trackRef}
      type="button"
      className="slide mt-5"
      disabled={busy}
      aria-describedby={describedBy}
      data-busy={busy ? "true" : "false"}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span ref={fillRef} aria-hidden="true" className="slide-fill" />
      {/* Parked at the far end rather than just ahead of the knob: beside the
          knob they crowded the centred label, and at the destination they say
          the more useful thing — drag to HERE. The knob covers them as it
          arrives, which is its own bit of feedback. */}
      <span aria-hidden="true" className="slide-hint" style={{ right: 14 }}>
        <span />
        <span />
        <span />
      </span>
      <span className="slide-label">{busy ? busyLabel : label}</span>
      <span ref={knobRef} aria-hidden="true" className="slide-knob">
        <svg viewBox="0 0 16 16" fill="none" className="size-4">
          <path
            d="M2.5 8h10M9 4.5 12.5 8 9 11.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="square"
          />
        </svg>
      </span>
    </button>
  );
}
