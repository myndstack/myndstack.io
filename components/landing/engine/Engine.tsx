"use client";

import { useEffect } from "react";

import { startDirector } from "./director/boot";

/**
 * The engine's director, as a client island with no markup: it starts the
 * boot half against the landing (poster mode: beats, words, skins, fronts,
 * chrome) and, when the device qualifies, lazily the live half (the spring,
 * the camera, the WebGL renderer). Everything it does is data attributes and
 * a few custom properties on elements the server already rendered.
 */
export default function Engine() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing");
    if (!root) return;
    return startDirector(root, async () => {
      // The tier probe (a throwaway WebGL context) and the live half load after the poster is up.
      const { chooseTier } = await import("./director/tier");
      const tier = chooseTier();
      if (tier === "poster") return null;
      const { startLive } = await import("./director/live");
      return (host) => startLive(host, tier);
    });
  }, []);

  return null;
}
