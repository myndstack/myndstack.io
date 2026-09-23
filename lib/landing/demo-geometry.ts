/**
 * The four demos that play inside the Core during the capabilities run, one
 * per discipline. Geometry only (ring viewBox units, centre 500,500), computed
 * on the server; motion tweens attributes, dash offsets and opacities on it.
 * demo-geometry.test.ts keeps every demo inside the ring's inner circle.
 */
import type { Point } from "@/lib/motion/core-geometry";
import { CIRCUIT_CORNERS, circuitPolyline, polylineD, tanglePolyline } from "@/lib/motion/paths";

export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/* ---------- 01 Cognitive AI: a small network whose signal passes an eval gate */
const LAYER_X = [322, 432, 552, 662] as const;
const LAYER_N = [4, 5, 5, 3] as const;
const SPACING = 58;

const layers: Point[][] = LAYER_X.map((x, li) =>
  Array.from({ length: LAYER_N[li] }, (_, i) => ({ x, y: 500 + (i - (LAYER_N[li] - 1) / 2) * SPACING })),
);
const edges: { readonly d: string; readonly layer: number }[] = [];
for (let li = 0; li < layers.length - 1; li++) {
  for (const a of layers[li]) for (const b of layers[li + 1]) edges.push({ d: `M${a.x} ${a.y}L${b.x} ${b.y}`, layer: li });
}
/** The one route the signal lights on its way to the gate. */
const route: Point[] = [layers[0][1], layers[1][2], layers[2][1], layers[3][1]];

export const NEURAL = {
  layers,
  edges,
  signal: polylineD([...route, { x: 726, y: 500 }]),
  gate: { x: 726, y: 472, w: 56, h: 56 } as Box,
  check: "M740 501L751 512L769 490",
} as const;

/* ---------- 02 Product & apps: a phone layout that reflows into a desktop one */
type Block = { readonly id: string; readonly phone: Box; readonly desktop: Box };

export const PRODUCT_DEMO = {
  frame: {
    phone: { x: 412, y: 318, w: 176, h: 344 } as Box,
    desktop: { x: 292, y: 372, w: 416, h: 256 } as Box,
  },
  blocks: [
    { id: "bar", phone: { x: 428, y: 346, w: 144, h: 16 }, desktop: { x: 308, y: 388, w: 384, h: 16 } },
    { id: "hero", phone: { x: 428, y: 374, w: 144, h: 92 }, desktop: { x: 308, y: 416, w: 184, h: 112 } },
    { id: "row1", phone: { x: 428, y: 478, w: 144, h: 48 }, desktop: { x: 504, y: 416, w: 188, h: 50 } },
    { id: "row2", phone: { x: 428, y: 536, w: 144, h: 48 }, desktop: { x: 504, y: 478, w: 188, h: 50 } },
    { id: "tabs", phone: { x: 428, y: 612, w: 144, h: 30 }, desktop: { x: 308, y: 540, w: 384, h: 72 } },
  ] as readonly Block[],
} as const;

/* ---------- 03 Design & modernization: a tangle that straightens into a circuit */
const POINTS = 64;
/** The polylines are drawn in a 1000×600 box; this maps them into the ring. */
const toRing = (p: Point): Point => ({ x: 310 + (p.x - 120) * 0.5, y: 380 + (p.y - 80) * 0.5 });

const circuit = circuitPolyline(POINTS).map(toRing);

export const DESIGN_DEMO = {
  tangle: polylineD(tanglePolyline(7, POINTS).map(toRing)),
  circuit: polylineD(circuit),
  /** Pads at the circuit's corners, lit once it has straightened. */
  nodes: CIRCUIT_CORNERS.map(toRing),
} as const;

/* ---------- 04 Architecture & delivery: a change travels commit → prod */
const STATION_W = 88;
const STATION_H = 44;
const STATION_X = [268, 394, 520, 646] as const;
const LABELS = ["COMMIT", "CI", "DEPLOY", "PROD"] as const;

export const PIPELINE_DEMO = {
  stations: STATION_X.map((x, i) => ({ x, y: 478, w: STATION_W, h: STATION_H, label: LABELS[i] })),
  /** The rail between the stations' centres. */
  rail: `M${STATION_X[0] + STATION_W / 2} 500H${STATION_X[3] + STATION_W / 2}`,
  /** Packet centre at each station, in order. */
  stops: STATION_X.map((x) => x + STATION_W / 2),
  y: 500,
} as const;
