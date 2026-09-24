/**
 * The director's one layout read: everything it needs from the page,
 * measured outside any frame (on load, resize, fonts, bfcache) and resolved
 * into the timeline — so every scroll frame is arithmetic on cached numbers.
 */
import { BEATS } from "@/lib/landing/engine/beats";
import { grid, type Grid } from "@/lib/landing/engine/layout";
import {
  placeFronts,
  sceneWindows,
  textWindows,
  type Front,
  type Sheet,
  type TextWindows,
} from "@/lib/landing/engine/scenes";
import type { Skin } from "@/lib/landing/engine/skins";
import { place, type MarkerBox, type Placed } from "@/lib/landing/engine/timeline";
import type { SceneId } from "@/lib/landing/engine/types";
import { RULER_CHAPTERS } from "@/lib/landing/chapters";
import { documentTop } from "@/lib/scroll-spy";

export type Layout = {
  readonly vw: number;
  readonly vh: number;
  readonly grid: Grid;
  readonly res: Placed;
  readonly fronts: readonly Front[];
  readonly win: TextWindows;
  readonly scenes: ReadonlyMap<SceneId, readonly [number, number]>;
  /** The flowing sheets, document px (they cover the stage). */
  readonly sheets: readonly Sheet[];
  /** The ruler's chapters, document px, in page order. */
  readonly chapters: readonly { readonly id: string; readonly top: number }[];
  readonly maxScroll: number;
};

export type Nodes = {
  readonly stage: HTMLElement;
  readonly sheetA: HTMLElement;
  readonly sheetB: HTMLElement;
  readonly groups: ReadonlyMap<string, readonly HTMLElement[]>;
  readonly furniture: ReadonlyMap<SceneId, readonly HTMLElement[]>;
  readonly panels: ReadonlyMap<SceneId, HTMLElement>;
  readonly posters: readonly (HTMLElement | SVGElement)[];
};

export function nodes(root: HTMLElement): Nodes | null {
  const stage = root.querySelector<HTMLElement>("[data-engine-stage]");
  const sheetA = stage?.querySelector<HTMLElement>('[data-sheet="a"]');
  const sheetB = stage?.querySelector<HTMLElement>('[data-sheet="b"]');
  if (!stage || !sheetA || !sheetB) return null;
  const groups = new Map<string, HTMLElement[]>();
  root.querySelectorAll<HTMLElement>("[data-beat-group]").forEach((el) => {
    const id = el.dataset.beatGroup ?? "";
    groups.set(id, [...(groups.get(id) ?? []), el]);
  });
  const furniture = new Map<SceneId, HTMLElement[]>();
  root.querySelectorAll<HTMLElement>("[data-furniture]").forEach((el) => {
    const id = el.dataset.furniture as SceneId;
    furniture.set(id, [...(furniture.get(id) ?? []), el]);
  });
  const panels = new Map<SceneId, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => {
    const panel = el.querySelector<HTMLElement>(":scope > .panel");
    if (panel) panels.set(el.dataset.scene as SceneId, panel);
  });
  return {
    stage,
    sheetA,
    sheetB,
    groups,
    furniture,
    panels,
    posters: Array.from(stage.querySelectorAll<HTMLElement | SVGElement>("[data-poster]")),
  };
}

export function measure(root: HTMLElement): Layout | null {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const markers = new Map<string, MarkerBox>();
  root.querySelectorAll<HTMLElement>("[data-beat-marker]").forEach((el) => {
    if (el.offsetParent === null) return;
    markers.set(el.dataset.beatMarker ?? "", { top: documentTop(el), height: el.offsetHeight });
  });
  if (!markers.size) return null;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
  const g = grid(vw, vh);
  const res = place(BEATS, markers, vh, maxScroll, g);
  const win = textWindows(res, vh);
  const sheets: Sheet[] = Array.from(root.querySelectorAll<HTMLElement>(".sheet")).map((el) => {
    const top = documentTop(el);
    return { top, bottom: top + el.offsetHeight, skin: (el.dataset.skin ?? "machined") as Skin };
  });
  const chapters = RULER_CHAPTERS.flatMap(({ id }) => {
    const el = document.getElementById(id);
    return el ? [{ id, top: documentTop(el) }] : [];
  });
  return {
    vw,
    vh,
    grid: g,
    res,
    fronts: placeFronts(res),
    win,
    scenes: sceneWindows(res, win),
    sheets,
    chapters,
    maxScroll,
  };
}
