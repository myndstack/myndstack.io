import { createTimeline, cubicBezier, stagger } from "@/lib/motion/anime/core";
import type { ChapterBuilder } from "@/lib/motion/chapter";
import { DUR, EASE_BRAND, STAGGER_MS } from "@/lib/motion/tokens";

import { LANDING_HEADLINE } from "@/lib/landing/content";

/** Glyphs a scrambling character cycles through before it settles. */
const SCRAMBLE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/<>[]{}=+#";

const randomGlyph = (): string =>
  SCRAMBLE_CHARSET[Math.floor(Math.random() * SCRAMBLE_CHARSET.length)];

type Scramble = { readonly render: (p: number) => void };

/**
 * Builds per-character spans for `lines` inside `host` (an aria-hidden element
 * React leaves empty) and returns a renderer: at progress p, characters whose
 * settle point has passed show their real glyph, the rest a random one.
 * Characters settle left to right with a little overlap, so the line resolves
 * like a readout rather than all at once.
 */
function scramble(host: HTMLElement, lines: readonly string[], lineClasses: readonly string[]): Scramble {
  host.textContent = "";
  const cells: { el: HTMLSpanElement; char: string; at: number }[] = [];
  const total = lines.reduce((n, l) => n + l.length, 0);
  let index = 0;
  lines.forEach((line, li) => {
    const row = document.createElement("span");
    row.className = `block ${lineClasses[li] ?? ""}`;
    for (const char of line) {
      const el = document.createElement("span");
      el.textContent = char;
      row.appendChild(el);
      // Spaces never scramble; letters settle across 25%→100% of the run.
      cells.push({ el, char, at: char === " " ? 0 : 0.25 + (0.75 * index) / total });
      index++;
    }
    host.appendChild(row);
  });
  return {
    render: (p) => {
      for (const cell of cells) {
        const next = p >= cell.at ? cell.char : randomGlyph();
        if (cell.el.textContent !== next) cell.el.textContent = next;
      }
    },
  };
}

/**
 * FIG.01 hero: guides draw, the FIG label and the headline scramble in over
 * their (hidden-while-playing) real text, the system diagram builds from its
 * dashed draft — lines draw, boxes solidify, ports pulse. ~1.6s, play-once.
 */
const buildHero: ChapterBuilder = ({ root, desktop }) => {
  const ease = cubicBezier(...EASE_BRAND);
  const diagram = root.querySelector<SVGSVGElement>(
    `[data-diagram="${desktop ? "wide" : "tall"}"]`,
  );

  const rulesX = root.querySelectorAll<HTMLElement>('[data-rule="x"]');
  const rulesY = root.querySelectorAll<HTMLElement>('[data-rule="y"]');
  const lines = diagram?.querySelectorAll<SVGPathElement>(".bp-line") ?? [];
  const solids = diagram?.querySelectorAll<SVGRectElement>(".bp-solid") ?? [];
  const ports = diagram?.querySelectorAll<SVGCircleElement>("[data-port]") ?? [];

  const headlineHost = root.querySelector<HTMLElement>(".landing-h1-scramble");
  const headline = headlineHost
    ? scramble(headlineHost, LANDING_HEADLINE, LANDING_HEADLINE.map((_, i) => (i === LANDING_HEADLINE.length - 1 ? "text-lime" : "")))
    : null;

  const figHost = root.querySelector<HTMLElement>("[data-scramble]");
  const figText = root.querySelector("[data-scramble-text]")?.textContent ?? "";
  const fig = figHost ? scramble(figHost, [figText], [""]) : null;

  const headlineProgress = { p: 0 };
  const figProgress = { p: 0 };

  const timeline = createTimeline({ autoplay: false, defaults: { ease } });

  timeline
    .add(rulesX, { scaleX: [0, 1], opacity: [0, 1], duration: DUR.draw, delay: stagger(STAGGER_MS) }, 0)
    .add(rulesY, { scaleY: [0, 1], opacity: [0, 1], duration: DUR.draw, delay: stagger(STAGGER_MS) }, 80)
    .add(
      figProgress,
      { p: [0, 1], duration: 700, ease: "linear", onUpdate: () => fig?.render(figProgress.p) },
      60,
    )
    .add(
      headlineProgress,
      { p: [0, 1], duration: 900, ease: "linear", onUpdate: () => headline?.render(headlineProgress.p) },
      160,
    )
    .add(lines, { strokeDashoffset: [1, 0], duration: DUR.draw, delay: stagger(STAGGER_MS * 2) }, 320)
    .add(solids, { opacity: [0, 1], duration: DUR.slow, delay: stagger(STAGGER_MS * 2) }, 460)
    .add(
      ports,
      { scale: [1, 1.8, 1], duration: DUR.slow, delay: stagger(STAGGER_MS) },
      900,
    );

  // Settle the overlays on their real text (they hide again once the chapter
  // is done, leaving the React-owned text in charge).
  timeline.then(() => {
    headline?.render(1);
    fig?.render(1);
  });

  return { timeline };
};

export default buildHero;
