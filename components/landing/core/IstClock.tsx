"use client";

import { useEffect, useState } from "react";

import { formatIst, msToNextMinute } from "@/lib/motion/clock";

/**
 * Studio time in Malappuram, for the hero HUD. The server renders a
 * placeholder — a real time baked in at ISR would be stale and mismatch on
 * hydration. Updates on the minute (not every second), pauses while the tab is
 * hidden. `data-live`: the zero-writes e2e test exempts it.
 */
export default function IstClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const now = Date.now();
      setTime(formatIst(now));
      timer = window.setTimeout(tick, msToNextMinute(now) + 50);
    };
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (!document.hidden) tick();
    };
    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const [hh, mm] = (time ?? "--:--").split(":");
  return (
    <span data-live className="tabular-nums">
      {hh}
      <span className="hud-colon">:</span>
      {mm}
    </span>
  );
}
