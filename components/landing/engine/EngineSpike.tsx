"use client";

import { useEffect } from "react";

import type { SpikeStats } from "@/lib/landing/engine/gl";

type SpikeApi = {
  readonly ready: Promise<void>;
  readonly rehost: () => void;
  readonly stats: () => SpikeStats;
};

declare global {
  interface Window {
    __engineSpike?: SpikeApi;
  }
}

/**
 * P0 spike, active only with `?engine=spike`: lazily loads the engine chunk,
 * renders one frame into a canvas inside host A, and exposes `rehost()` to
 * move the same canvas into host B — the hosting model depends on the WebGL
 * context surviving that move. Replaced by the director in P3.
 */
export default function EngineSpike() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("engine") !== "spike") return;

    const makeHost = (side: "left" | "right") => {
      const host = document.createElement("div");
      host.setAttribute("aria-hidden", "true");
      host.dataset.spikeHost = side;
      Object.assign(host.style, {
        position: "fixed",
        top: "96px",
        [side]: "24px",
        width: "320px",
        height: "320px",
        zIndex: "1",
        pointerEvents: "none",
      });
      document.body.appendChild(host);
      return host;
    };
    const hostA = makeHost("right");
    const hostB = makeHost("left");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    hostA.appendChild(canvas);

    let dispose = () => {};
    const ready = import("@/lib/landing/engine/gl").then(({ createSpike }) => {
      const spike = createSpike(canvas);
      if (!spike) {
        document.documentElement.dataset.engineSpike = "failed";
        return;
      }
      spike.resize(320, 320, window.devicePixelRatio);
      spike.render();
      dispose = spike.dispose;
      document.documentElement.dataset.engineSpike = "live";
      window.__engineSpike = {
        ready,
        rehost: () => {
          hostB.appendChild(canvas);
          spike.render();
        },
        stats: spike.stats,
      };
    });

    return () => {
      dispose();
      hostA.remove();
      hostB.remove();
      delete window.__engineSpike;
      delete document.documentElement.dataset.engineSpike;
    };
  }, []);

  return null;
}
