/**
 * Whether this visit gets the live engine, and at what tier — decided before
 * any three.js is fetched (lib/landing/engine/tiers.ts holds the rules).
 * Review switches: `?engine=off` (posters), `?tier=low|medium|high`.
 */
import { PIN_QUERY } from "@/lib/motion/pin";
import { initialTier, type DeviceProfile } from "@/lib/landing/engine/tiers";
import type { QualityTier } from "@/lib/landing/engine/types";

type TestOptIn = { readonly allowSoftware?: boolean; readonly tier?: QualityTier };
type NavigatorExtras = Navigator & { readonly deviceMemory?: number; readonly connection?: { readonly saveData?: boolean } };

declare global {
  interface Window {
    __MS_ENGINE_TEST?: TestOptIn;
  }
}

/** A software rasteriser fails the major-performance-caveat probe. */
function softwareOnly(): boolean {
  try {
    const probe = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    return probe === null;
  } catch {
    return true;
  }
}

export function chooseTier(): QualityTier {
  const q = new URLSearchParams(window.location.search);
  if (q.get("engine") === "off") return "poster";
  const nav = navigator as NavigatorExtras;
  const mq = (query: string) => window.matchMedia(query).matches;
  const test = window.__MS_ENGINE_TEST;
  const profile: DeviceProfile = {
    webgl2: typeof WebGL2RenderingContext !== "undefined",
    software: softwareOnly(),
    saveData: nav.connection?.saveData === true,
    reducedMotion: mq("(prefers-reduced-motion: reduce)"),
    motionOff: document.documentElement.dataset.anim !== "on",
    forcedColors: mq("(forced-colors: active)"),
    automation: nav.webdriver === true,
    testOptIn: Boolean(test),
    allowSoftware: test?.allowSoftware === true,
    pinned: mq(PIN_QUERY),
    coarse: mq("(pointer: coarse)"),
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
  };
  const forced = q.get("tier");
  const tier = initialTier(profile, test?.tier);
  if (tier !== "poster" && (forced === "low" || forced === "medium" || forced === "high")) return forced;
  return tier;
}
