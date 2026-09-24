/**
 * The one signals store the landing's own components share with the engine's
 * director: ContrastSwitch sets the studio mode, LandingFaq the open question,
 * the director's delegated pricing listeners the focused tier. Setting a value
 * never re-renders anything; the director reads it and writes the DOM (and,
 * live, the renderer's uniforms). Client-only module state — the director
 * resets it when it unmounts.
 */
import { createSignals } from "./signals";
import type { SignalMap } from "./types";

export const INITIAL_SIGNALS: SignalMap = {
  "studio.mode": "ours",
  "pricing.focus": 0,
  "faq.open": 0,
  "hero.intro": "playing",
};

export const engineSignals = createSignals<SignalMap>(INITIAL_SIGNALS);
