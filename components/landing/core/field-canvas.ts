/**
 * Renders the Core's particle field (lib/motion/field.ts) and inner waveform
 * onto a canvas. Client-only; called from a motion builder INSIDE its anime
 * scope, so the frame timer belongs to the scope and `revert()` stops it.
 *
 * - One anime timer (frameRate 60) — no rAF loop of its own.
 * - No canvas at all when the device budget is 0 (save-data, reduced motion,
 *   automation, tiny devices get fewer particles; see budgetFor).
 * - Pixel ratio capped (2 desktop / 1.5 touch) and total pixels capped (~4MP).
 * - clearRect every frame, trails drawn analytically along each particle's
 *   spiral — no translucent fade (which leaves a grey haze on 8-bit canvas).
 * - Adaptive quality: sustained slow frames halve the field, then stop it.
 */
import { createTimer } from "@/lib/motion/anime/timer";
import { CORE } from "@/lib/motion/core-geometry";
import { budgetFor, createField, stepField, waveform, type Field } from "@/lib/motion/field";
import { INITIAL_QUALITY, nextQuality, type QualityState } from "@/lib/motion/quality";
import { clampDt } from "@/lib/motion/smooth";
import { SPECTRUM, type Hue } from "@/lib/motion/tokens";

export type FieldHandle = {
  /** Allowed to run (on screen, tab visible). */
  readonly play: () => void;
  readonly pause: () => void;
  /** 0 parks the field (timer stopped); 1 is full flow. */
  readonly setEnergy: (energy: number) => void;
  readonly dispose: () => void;
};

type Options = {
  readonly seed: number;
  /** Draw the breathing waveform in the centre. */
  readonly wave: boolean;
  readonly coarse: boolean;
  /** Fraction of the device budget to use (a run with demos wants fewer). */
  readonly density?: number;
};

/** Hue of each ring sector, by whole degree (clockwise from 12 o'clock). */
const SECTOR_HUE: readonly Hue[] = Array.from({ length: 360 }, (_, deg) => {
  const hit = CORE.arcs.find((a) => {
    const d = ((deg - a.a0) % 360 + 360) % 360;
    return d <= a.a1 - a.a0 + 8;
  });
  return (hit?.key ?? "lime") as Hue;
});
const HUES = Object.keys(SPECTRUM) as Hue[];
const MAX_PIXELS = 4_000_000;
const WAVE_BARS = 41;
/** Particle field extends past the ring: the container is 1.5× the ring box. */
const FIELD_SCALE = 1.5;
/** Seconds of spiral each trail represents. */
const TRAIL_S = 0.45;

function isAutomated(): boolean {
  const w = window as unknown as { __MS_FIELD_TEST?: boolean };
  return navigator.webdriver === true && !w.__MS_FIELD_TEST;
}

function makeSprite(hex: string): HTMLCanvasElement {
  const size = 48;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `${hex}ff`);
  grad.addColorStop(0.25, `${hex}88`);
  grad.addColorStop(1, `${hex}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function mountField(
  container: HTMLElement,
  { seed, wave, coarse, density = 1 }: Options,
): FieldHandle | null {
  const connection = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  const budget = budgetFor({
    width: window.innerWidth,
    coarse,
    cores: navigator.hardwareConcurrency || 4,
    saveData: connection?.saveData === true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    automated: isAutomated(),
  });
  const count = Math.round(budget * density);
  if (count === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.className = "core-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  container.appendChild(canvas);
  const stage = container.closest<HTMLElement>("[data-stage]");
  stage?.setAttribute("data-field", "on");

  const field: Field = createField(count, seed);
  let sprites = HUES.map((h) => makeSprite(SPECTRUM[h]));
  let waveGrad: CanvasGradient | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let wanted = false;
  let energy = 1;
  let running = false;
  let lastTick = 0;
  let quality: QualityState = INITIAL_QUALITY;
  let elapsed = 0;

  const resize = (cssW: number, cssH: number) => {
    const cap = coarse ? 1.5 : 2;
    dpr = Math.min(window.devicePixelRatio || 1, cap);
    const pixels = cssW * cssH * dpr * dpr;
    if (pixels > MAX_PIXELS) dpr *= Math.sqrt(MAX_PIXELS / pixels);
    width = Math.max(1, Math.round(cssW * dpr));
    height = Math.max(1, Math.round(cssH * dpr));
    canvas.width = width;
    canvas.height = height;
    const ringR = (width / FIELD_SCALE) * (CORE.rArc / CORE.size);
    waveGrad = ctx.createLinearGradient(width / 2 - ringR * 0.6, 0, width / 2 + ringR * 0.6, 0);
    waveGrad.addColorStop(0, SPECTRUM.ai);
    waveGrad.addColorStop(0.35, SPECTRUM.product);
    waveGrad.addColorStop(0.5, SPECTRUM.lime);
    waveGrad.addColorStop(0.68, SPECTRUM.design);
    waveGrad.addColorStop(1, SPECTRUM.arch);
  };

  const ro = new ResizeObserver(([entry]) => {
    const box = entry.contentRect;
    resize(box.width, box.height);
  });
  ro.observe(container);

  // Moving the window to a screen with another pixel ratio: re-arm and resize.
  let dprQuery: MediaQueryList | null = null;
  const onDprChange = () => {
    armDpr();
    resize(width / dpr, height / dpr);
  };
  const armDpr = () => {
    dprQuery?.removeEventListener("change", onDprChange);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", onDprChange);
  };
  armDpr();

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const ringR = (width / FIELD_SCALE) * (CORE.rArc / CORE.size);
    const count = quality.level === 0 ? field.count : Math.floor(field.count / 2);

    if (quality.level < 2) {
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1, dpr * 0.9);
      for (let h = 0; h < HUES.length; h++) {
        const hue = HUES[h];
        ctx.strokeStyle = SPECTRUM[hue];
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const a = field.angle[i];
          const deg = Math.floor(((a * 180) / Math.PI + 90 + 720) % 360);
          if (SECTOR_HUE[deg] !== hue) continue;
          const r = field.radius[i];
          const s = field.speed[i];
          const x = cx + Math.cos(a) * r * ringR;
          const y = cy + Math.sin(a) * r * ringR;
          const rt = r + 0.09 * s * TRAIL_S;
          const at = a - (0.35 * s * TRAIL_S) / Math.max(0.5, rt);
          ctx.moveTo(x, y);
          ctx.lineTo(cx + Math.cos(at) * rt * ringR, cy + Math.sin(at) * rt * ringR);
        }
        ctx.globalAlpha = 0.3;
        ctx.stroke();
      }
      const spriteSize = 10 * dpr;
      for (let i = 0; i < count; i++) {
        const a = field.angle[i];
        const r = field.radius[i];
        // Brightest near the ring, fading out toward both edges of the field.
        const nearRing = 1 - Math.min(1, Math.abs(r - 1) / 0.35);
        if (nearRing <= 0.05) continue;
        const deg = Math.floor(((a * 180) / Math.PI + 90 + 720) % 360);
        ctx.globalAlpha = 0.25 + nearRing * 0.75;
        ctx.drawImage(
          sprites[HUES.indexOf(SECTOR_HUE[deg])],
          cx + Math.cos(a) * r * ringR - spriteSize / 2,
          cy + Math.sin(a) * r * ringR - spriteSize / 2,
          spriteSize,
          spriteSize,
        );
      }
    }

    if (wave && waveGrad) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = waveGrad;
      ctx.lineWidth = Math.max(1.5, ringR * 0.012);
      ctx.lineCap = "round";
      ctx.beginPath();
      const step = ringR * 0.027;
      for (let i = 0; i < WAVE_BARS; i++) {
        const x = cx + (i - (WAVE_BARS - 1) / 2) * step;
        const h = ringR * (0.045 + waveform(elapsed, i, WAVE_BARS) * 0.49);
        ctx.moveTo(x, cy - h / 2);
        ctx.lineTo(x, cy + h / 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const timer = createTimer({
    autoplay: false,
    frameRate: 60,
    onUpdate: () => {
      const now = performance.now();
      const dt = clampDt(now - lastTick);
      lastTick = now;
      elapsed += dt * (0.4 + 0.6 * energy);
      quality = nextQuality(quality, dt || 16.7, now);
      if (quality.level === 2 && stage) stage.dataset.quality = "low";
      stepField(field, dt, { energy });
      draw();
    },
  });

  const sync = () => {
    const shouldRun = wanted && energy > 0;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
      lastTick = performance.now();
      timer.resume();
    } else {
      timer.pause();
    }
  };

  const onLost = (e: Event) => {
    e.preventDefault();
    timer.pause();
    running = false;
  };
  const onRestored = () => {
    sprites = HUES.map((h) => makeSprite(SPECTRUM[h]));
    resize(width / dpr, height / dpr);
    sync();
  };
  canvas.addEventListener("contextlost", onLost);
  canvas.addEventListener("contextrestored", onRestored);

  return {
    play: () => {
      wanted = true;
      sync();
    },
    pause: () => {
      wanted = false;
      sync();
    },
    setEnergy: (e: number) => {
      energy = e < 0 ? 0 : e > 1 ? 1 : e;
      sync();
    },
    dispose: () => {
      timer.pause();
      ro.disconnect();
      dprQuery?.removeEventListener("change", onDprChange);
      canvas.removeEventListener("contextlost", onLost);
      canvas.removeEventListener("contextrestored", onRestored);
      canvas.remove();
      stage?.removeAttribute("data-field");
      stage?.removeAttribute("data-quality");
    },
  };
}
