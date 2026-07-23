"use client";

import { useEffect, useRef, useState } from "react";
import {
  bindAttributes,
  createProgram,
  LINE_FRAGMENT_SHADER,
  POINT_FRAGMENT_SHADER,
  STRIDE,
  type Program,
} from "@/lib/gl";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";
import ParticleField from "./ParticleField";

/** Nodes scale with viewport area, up to this ceiling. */
const MAX_NODES = 460;
const AREA_PER_NODE = 3800;
/** Nodes closer than this get a link. Doubles as the spatial-hash cell size. */
const LINK_DISTANCE = 120;
const DRIFT = 0.3;
const PARALLAX = 0.03;
const PARALLAX_EASE = 0.06;
const CURSOR_RADIUS = 110;

/** Signals travelling the network at any moment. */
const PULSE_COUNT = 14;
const PULSE_SPEED = 0.011;
/** Length of a pulse's comet tail, as a fraction of the link it's crossing. */
const PULSE_TAIL = 0.34;
/** Extra pulses spawned when a hero CTA is hovered. */
const BURST_SIZE = 10;

/** Fired by the hero CTAs — see `Hero`. */
export const PULSE_EVENT = "myndstack:pulse";

const LIME: [number, number, number] = [201 / 255, 242 / 255, 77 / 255];
const WHITE: [number, number, number] = [1, 1, 1];

/** Room for ~6 links per node before we start dropping them. */
const MAX_LINKS = MAX_NODES * 6;

type Pulse = { from: number; to: number; t: number; speed: number };

/**
 * The hero constellation, rendered on the GPU.
 *
 * Same visual language as the 2D original — drifting nodes, links that fade
 * with distance — plus what the 2D version couldn't afford: several times the
 * node count, per-node depth parallax, and lime signals that route themselves
 * hop by hop through the network.
 *
 * Falls back to the 2D canvas where WebGL is unavailable, or below 760px (dimmed
 * there — the GPU network is too heavy for a phone). Renders nothing under
 * reduced motion.
 */
export default function HeroNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);
  const reduced = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 47.5rem)");

  useEffect(() => {
    if (reduced || !isDesktop) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    }) ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) {
      setUnsupported(true);
      return;
    }

    const pointProgram = createProgram(gl, POINT_FRAGMENT_SHADER);
    const lineProgram = createProgram(gl, LINE_FRAGMENT_SHADER);
    if (!pointProgram || !lineProgram) {
      setUnsupported(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let nodeCount = 0;

    // --- Node state -------------------------------------------------------
    const px = new Float32Array(MAX_NODES);
    const py = new Float32Array(MAX_NODES);
    const vx = new Float32Array(MAX_NODES);
    const vy = new Float32Array(MAX_NODES);
    /** 0.35 → 1. Drives size, brightness and how much parallax a node gets. */
    const depth = new Float32Array(MAX_NODES);

    // --- Spatial hash (rebuilt each frame, allocation-free) ---------------
    let cols = 0;
    let rows = 0;
    let cellCounts = new Int32Array(0);
    let cellStarts = new Int32Array(0);
    let cellCursor = new Int32Array(0);
    const cellItems = new Int32Array(MAX_NODES);

    // --- GPU-bound vertex data -------------------------------------------
    const nodeVerts = new Float32Array(MAX_NODES * STRIDE);
    const lineVerts = new Float32Array((MAX_LINKS + PULSE_COUNT + BURST_SIZE * 2) * 2 * STRIDE);
    const pulseVerts = new Float32Array((PULSE_COUNT + BURST_SIZE * 2) * STRIDE);

    const buffer = gl.createBuffer();
    // Sized once to the largest of the three vertex arrays; each draw refills
    // it with bufferSubData rather than reallocating GPU storage per frame.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, lineVerts.byteLength, gl.DYNAMIC_DRAW);

    const pulses: Pulse[] = [];

    const seed = () => {
      nodeCount = Math.min(MAX_NODES, Math.round((width * height) / AREA_PER_NODE));
      for (let i = 0; i < nodeCount; i++) {
        px[i] = Math.random() * width;
        py[i] = Math.random() * height;
        vx[i] = (Math.random() - 0.5) * DRIFT;
        vy[i] = (Math.random() - 0.5) * DRIFT;
        depth[i] = 0.35 + Math.random() * 0.65;
      }

      cols = Math.max(1, Math.ceil(width / LINK_DISTANCE));
      rows = Math.max(1, Math.ceil(height / LINK_DISTANCE));
      const cells = cols * rows;
      cellCounts = new Int32Array(cells);
      cellStarts = new Int32Array(cells + 1);
      cellCursor = new Int32Array(cells);

      pulses.length = 0;
      for (let i = 0; i < PULSE_COUNT; i++) pulses.push(spawnPulse());
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      seed();
    };

    function cellIndex(x: number, y: number) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / LINK_DISTANCE)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / LINK_DISTANCE)));
      return cy * cols + cx;
    }

    /** Counting sort of nodes into grid cells — no per-frame allocation. */
    function buildGrid() {
      cellCounts.fill(0);
      for (let i = 0; i < nodeCount; i++) cellCounts[cellIndex(px[i], py[i])]++;

      let running = 0;
      for (let c = 0; c < cellCounts.length; c++) {
        cellStarts[c] = running;
        cellCursor[c] = running;
        running += cellCounts[c];
      }
      cellStarts[cellCounts.length] = running;

      for (let i = 0; i < nodeCount; i++) {
        cellItems[cellCursor[cellIndex(px[i], py[i])]++] = i;
      }
    }

    /** Calls `visit` for every node in the 3×3 cell block around (x, y). */
    function forEachNeighbour(x: number, y: number, visit: (j: number) => void) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / LINK_DISTANCE)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / LINK_DISTANCE)));

      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          if (nx < 0 || nx >= cols) continue;
          const cell = ny * cols + nx;
          for (let k = cellStarts[cell]; k < cellStarts[cell + 1]; k++) visit(cellItems[k]);
        }
      }
    }

    function spawnPulse(): Pulse {
      const pulse: Pulse = {
        from: 0,
        to: 0,
        t: Math.random(),
        speed: PULSE_SPEED * (0.7 + Math.random() * 0.8),
      };
      relocate(pulse);
      return pulse;
    }

    /**
     * Drops a pulse onto a node that actually has a neighbour. Without the
     * retry a stranded pulse would be handed a random node anywhere on screen
     * and streak across the whole hero instead of hopping one link.
     */
    function relocate(pulse: Pulse) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const from = Math.floor(Math.random() * Math.max(1, nodeCount));
        const to = pickNeighbour(from);
        if (to !== -1) {
          pulse.from = from;
          pulse.to = to;
          pulse.t = 0;
          return;
        }
      }
      // Nowhere to go this frame — park it as a zero-length segment.
      pulse.to = pulse.from;
      pulse.t = 0;
    }

    /** A random node within link range, or -1. Signals follow visible edges only. */
    function pickNeighbour(from: number): number {
      const candidates: number[] = [];
      forEachNeighbour(px[from], py[from], (j) => {
        if (j === from) return;
        const dx = px[j] - px[from];
        const dy = py[j] - py[from];
        if (dx * dx + dy * dy < LINK_DISTANCE * LINK_DISTANCE) candidates.push(j);
      });

      if (!candidates.length) return -1;
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // --- Pointer ----------------------------------------------------------
    const mouse = { x: -1e5, y: -1e5 };
    let offsetX = 0;
    let offsetY = 0;

    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -1e5;
      mouse.y = -1e5;
    };

    const onBurst = () => {
      for (let i = 0; i < BURST_SIZE; i++) pulses.push(spawnPulse());
      // Keep the steady-state population bounded.
      while (pulses.length > PULSE_COUNT + BURST_SIZE * 2) pulses.shift();
    };

    // --- Vertex writers ---------------------------------------------------
    let vi = 0;
    const write = (
      target: Float32Array,
      x: number,
      y: number,
      size: number,
      alpha: number,
      tint: number,
    ) => {
      target[vi] = x;
      target[vi + 1] = y;
      target[vi + 2] = size;
      target[vi + 3] = alpha;
      target[vi + 4] = tint;
      vi += STRIDE;
    };

    const draw = (
      program: Program,
      data: Float32Array,
      count: number,
      mode: number,
      blendAdditive: boolean,
    ) => {
      if (count === 0) return;

      gl.useProgram(program.program);
      gl.uniform2f(program.uniforms.res, width, height);
      gl.uniform3fv(program.uniforms.base, WHITE);
      gl.uniform3fv(program.uniforms.accent, LIME);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * STRIDE));
      bindAttributes(gl, program);

      // Premultiplied source, so the "normal" factor is ONE, not SRC_ALPHA.
      gl.blendFunc(gl.ONE, blendAdditive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(mode, 0, count);
    };

    // --- Frame ------------------------------------------------------------
    let raf = 0;
    let visible = true;

    const frame = () => {
      // Drift, reflecting at the edges without letting velocity accumulate.
      for (let i = 0; i < nodeCount; i++) {
        px[i] += vx[i];
        py[i] += vy[i];
        if (px[i] < 0) { px[i] = 0; vx[i] = Math.abs(vx[i]); }
        if (px[i] > width) { px[i] = width; vx[i] = -Math.abs(vx[i]); }
        if (py[i] < 0) { py[i] = 0; vy[i] = Math.abs(vy[i]); }
        if (py[i] > height) { py[i] = height; vy[i] = -Math.abs(vy[i]); }
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      buildGrid();

      const hasCursor = mouse.x > -1e4;
      const targetX = hasCursor ? (mouse.x - width / 2) * PARALLAX : 0;
      const targetY = hasCursor ? (mouse.y - height / 2) * PARALLAX : 0;
      offsetX += (targetX - offsetX) * PARALLAX_EASE;
      offsetY += (targetY - offsetY) * PARALLAX_EASE;

      /** Screen position with this node's share of the parallax applied. */
      const sx = (i: number) => px[i] + offsetX * depth[i];
      const sy = (i: number) => py[i] + offsetY * depth[i];

      // Links -------------------------------------------------------------
      vi = 0;
      let lineVertexCount = 0;
      const maxLinkFloats = MAX_LINKS * 2 * STRIDE;

      for (let i = 0; i < nodeCount; i++) {
        const xi = sx(i);
        const yi = sy(i);

        forEachNeighbour(px[i], py[i], (j) => {
          if (j <= i || vi >= maxLinkFloats) return;

          const xj = sx(j);
          const yj = sy(j);
          const dx = xi - xj;
          const dy = yi - yj;
          const d2 = dx * dx + dy * dy;
          if (d2 >= LINK_DISTANCE * LINK_DISTANCE) return;

          const closeness = 1 - Math.sqrt(d2) / LINK_DISTANCE;
          const alpha = closeness * 0.15 * ((depth[i] + depth[j]) / 2);

          write(lineVerts, xi, yi, 1, alpha, 0);
          write(lineVerts, xj, yj, 1, alpha, 0);
          lineVertexCount += 2;
        });
      }

      // Pulse tails ride in the same buffer as the links.
      for (const pulse of pulses) {
        if (vi + 2 * STRIDE > lineVerts.length) break;

        const headT = pulse.t;
        const tailT = Math.max(0, headT - PULSE_TAIL);
        const x0 = sx(pulse.from);
        const y0 = sy(pulse.from);
        const x1 = sx(pulse.to);
        const y1 = sy(pulse.to);

        write(lineVerts, x0 + (x1 - x0) * tailT, y0 + (y1 - y0) * tailT, 1, 0, 1);
        write(lineVerts, x0 + (x1 - x0) * headT, y0 + (y1 - y0) * headT, 1, 0.75, 1);
        lineVertexCount += 2;
      }

      draw(lineProgram, lineVerts, lineVertexCount, gl.LINES, false);

      // Nodes ---------------------------------------------------------------
      vi = 0;
      for (let i = 0; i < nodeCount; i++) {
        const x = sx(i);
        const y = sy(i);
        const near =
          hasCursor && Math.hypot(mouse.x - x, mouse.y - y) < CURSOR_RADIUS ? 1 : 0;

        const size = (near ? 5.2 : 3.2) * depth[i] * dpr;
        const alpha = near ? 0.95 : 0.2 + 0.4 * depth[i];
        write(nodeVerts, x, y, size, alpha, near);
      }
      draw(pointProgram, nodeVerts, nodeCount, gl.POINTS, true);

      // Pulse heads ---------------------------------------------------------
      vi = 0;
      let pulseCount = 0;
      for (const pulse of pulses) {
        if (vi + STRIDE > pulseVerts.length) break;

        pulse.t += pulse.speed;
        if (pulse.t >= 1) {
          // Arrived: hop onward from this node, so signals route themselves.
          const next = pickNeighbour(pulse.to);
          if (next === -1) {
            relocate(pulse);
          } else {
            pulse.from = pulse.to;
            pulse.to = next;
            pulse.t = 0;
          }
        }

        const x0 = sx(pulse.from);
        const y0 = sy(pulse.from);
        const x1 = sx(pulse.to);
        const y1 = sy(pulse.to);

        write(
          pulseVerts,
          x0 + (x1 - x0) * pulse.t,
          y0 + (y1 - y0) * pulse.t,
          5.5 * dpr,
          0.95,
          1,
        );
        pulseCount++;
      }
      draw(pointProgram, pulseVerts, pulseCount, gl.POINTS, true);

      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    // --- Wiring -----------------------------------------------------------
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    resize();

    const onContextLost = (event: Event) => {
      event.preventDefault();
      visible = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Stop burning frames once the hero scrolls away.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) frame();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    /**
     * Resize fires continuously while a window is dragged, and each pass
     * reallocates the spatial-hash arrays and re-scatters every node. Settle
     * first, then rebuild once.
     */
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    window.addEventListener("resize", onResize, { passive: true });
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("webglcontextlost", onContextLost);
    window.addEventListener(PULSE_EVENT, onBurst);

    frame();

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener(PULSE_EVENT, onBurst);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(pointProgram.program);
      gl.deleteProgram(lineProgram.program);
    };
  }, [reduced, isDesktop]);

  if (reduced) return null;
  // Below 760px the GPU network is too heavy for the battery, so the hero gets the
  // lighter 2D field instead — dimmed, so it reads as texture rather than a bare
  // black panel. Naturally sparse at phone dimensions (area-scaled node count).
  if (!isDesktop) return <ParticleField dim />;
  if (unsupported) return <ParticleField />;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full"
    />
  );
}
