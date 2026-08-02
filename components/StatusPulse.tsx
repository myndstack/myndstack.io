"use client";

import { useEffect, useState } from "react";

type Status = "operational" | "degraded";

/**
 * A small live-status pill for the footer meta row. Polls the existing
 * /api/health endpoint (a pure function of env — no new backend) and reflects
 * real readiness: a pulsing lime dot when the mail path is healthy, a steady
 * amber dot when it is broken.
 *
 * Deliberately optimistic on failure: a transient network blip or an aborted
 * fetch leaves the pill "operational" rather than flashing a false outage. Only
 * an explicit unhealthy response (non-2xx or `ok: false`) flips it to degraded.
 * Under reduced motion the dot is static (the global reduced-motion block
 * collapses the pulse animation).
 */
export default function StatusPulse() {
  const [status, setStatus] = useState<Status>("operational");

  useEffect(() => {
    const controller = new AbortController();
    // Poll on mount, then on a slow interval — this is ambient reassurance, not
    // a monitoring dashboard, so a light touch is plenty.
    const check = async () => {
      try {
        const res = await fetch("/api/health", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as { ok?: boolean };
        setStatus(res.ok && data.ok !== false ? "operational" : "degraded");
      } catch {
        // Aborted or offline — don't cry wolf; keep the last good state.
      }
    };
    void check();
    const id = window.setInterval(check, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  const operational = status === "operational";
  return (
    <span
      className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-t5 uppercase"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={`status-dot${operational ? "" : " is-degraded"}`}
      />
      {operational ? "Operational" : "Degraded"}
    </span>
  );
}
