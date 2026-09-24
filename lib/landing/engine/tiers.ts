/**
 * Which quality tier the engine starts at, and what each tier costs. Pure: the
 * director gathers a DeviceProfile once (feature queries, the WebGL probe) and
 * the renderer degrades at runtime through lib/motion/quality.ts (levels 0–3
 * map onto TIERS). "poster" means no WebGL at all: the drawn posters stay.
 */
import type { QualityTier, TierParams } from "./types";

/** Best first; a quality level is an index into this list. */
export const TIERS: readonly QualityTier[] = ["high", "medium", "low", "poster"];

export type DeviceProfile = {
  readonly webgl2: boolean;
  /** Software rasteriser (the failIfMajorPerformanceCaveat probe failed, or SwiftShader). */
  readonly software: boolean;
  readonly saveData: boolean;
  readonly reducedMotion: boolean;
  /** `?motion=off`, or html[data-anim] not "on". */
  readonly motionOff: boolean;
  readonly forcedColors: boolean;
  /** navigator.webdriver. */
  readonly automation: boolean;
  /** window.__MS_ENGINE_TEST — read only under automation. */
  readonly testOptIn: boolean;
  readonly allowSoftware: boolean;
  /** The pinned desktop layout (PIN_QUERY) is active. */
  readonly pinned: boolean;
  readonly coarse: boolean;
  /** navigator.hardwareConcurrency / deviceMemory, when the browser reports them. */
  readonly cores: number | undefined;
  readonly memoryGb: number | undefined;
};

const rank = (tier: QualityTier) => TIERS.indexOf(tier);
const lower = (a: QualityTier, b: QualityTier): QualityTier => (rank(a) >= rank(b) ? a : b);

/**
 * `forced` is a test's `tier` option: honoured only with the opt-in, and never
 * above what the rules allow (a test can make the engine cheaper, not riskier).
 */
export function initialTier(p: DeviceProfile, forced?: QualityTier): QualityTier {
  // Preferences first: nothing overrides these, not even a test opt-in.
  if (p.reducedMotion || p.motionOff || p.forcedColors) return "poster";
  if (!p.webgl2) return "poster";
  if (p.automation && !p.testOptIn) return "poster";
  if (p.software && !(p.automation && p.testOptIn && p.allowSoftware)) return "poster";
  if (p.saveData) return "poster";

  let tier: QualityTier = "high";
  if (!p.pinned) tier = "low";
  else if (p.memoryGb !== undefined && p.memoryGb < 4) tier = "low";
  else if (p.cores !== undefined && p.cores <= 4) tier = "medium";

  if (forced && p.automation && p.testOptIn) tier = lower(tier, forced);
  return tier;
}

/** One step down; poster is the floor. */
export function tierAfter(tier: QualityTier): QualityTier {
  return TIERS[Math.min(rank(tier) + 1, TIERS.length - 1)];
}

const PARAMS: Record<QualityTier, TierParams> = {
  high: { dprCap: 2, msaa: true, lod: 0, halos: true, hiddenLines: true, dust: true, ambientFps: 60 },
  medium: { dprCap: 1.5, msaa: true, lod: 1, halos: true, hiddenLines: false, dust: false, ambientFps: 60 },
  low: { dprCap: 1, msaa: false, lod: 2, halos: false, hiddenLines: false, dust: false, ambientFps: 30 },
  poster: { dprCap: 0, msaa: false, lod: 2, halos: false, hiddenLines: false, dust: false, ambientFps: 0 },
};

/** Phones keep a sharper low tier: their screens are small and dense. */
export function tierParams(tier: QualityTier, phone: boolean): TierParams {
  const params = PARAMS[tier];
  return tier === "low" && phone ? { ...params, dprCap: 1.5 } : params;
}
