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
import { useMediaQuery, useReducedMotion, useSaveData } from "@/lib/hooks";
import { subscribeToScroll } from "@/lib/scroll";
import ParticleField from "./ParticleField";

/** Nodes scale with viewport area, up to this ceiling. */
const MAX_NODES = 460;
const AREA_PER_NODE = 3800;
/** Nodes closer than this get a link. Doubles as the spatial-hash cell size. */
const LINK_DISTANCE = 120;
const DRIFT = 0.3;
/** Max tilt of the whole constellation toward the cursor, in radians (~7°). */
const MAX_TILT = 0.12;
/** How fast the tilt eases toward the cursor target each frame. */
const TILT_EASE = 0.06;
/**
 * Perspective params fed to the vertex shader as `u_persp` AND used by the CPU
 * proximity projection in the frame loop, so the cursor highlight and shockwave
 * stay glued to where each node is actually drawn under tilt. One source of
 * truth — MUST stay in sync with the projection in VERTEX_SHADER (lib/gl.ts):
 *   z = (depth - DEPTH_MID) * Z_RANGE;  w = CAM_Z / (CAM_Z - rotatedZ).
 * The cloud is centred on the mid-depth plane (mid of the seeded 0.35..1 range)
 * so at tilt 0 the resting frame barely moves; CAM_Z dwarfs the rotated z, so
 * the perspective stays gentle. These are the knobs for the effect's strength.
 */
const DEPTH_MID = 0.675;
const Z_RANGE = 360;
const CAM_Z = 1500;
const CURSOR_RADIUS = 110;

/**
 * Hero scroll recede. As the hero scrolls out of view the whole constellation
 * pulls back along view-space z and fades, handing the frame to the content
 * below (StackStory). `RECEDE_PUSH` is the pull-back depth at full exit as a
 * multiple of `Z_RANGE` — fed to the shader in px, so lib/gl.ts keeps no magic
 * number and the CPU proximity projection can mirror it from the same source.
 * The ease runs across [RECEDE_START, RECEDE_END] of the hero's own scroll-out,
 * so the resting hero (and the LCP paint) is untouched until you actually leave.
 */
const RECEDE_PUSH = 2.5;
const RECEDE_START = 0.12;
const RECEDE_END = 0.9;

/** Signals travelling the network at any moment. */
const PULSE_COUNT = 14;
const PULSE_SPEED = 0.011;
/** Length of a pulse's comet tail, as a fraction of the link it's crossing. */
const PULSE_TAIL = 0.34;
/** Extra pulses spawned when a hero CTA is hovered. */
const BURST_SIZE = 10;
/** CTA shockwave: an expanding ring that brightens the nodes it sweeps past. */
const BURST_MAX_RADIUS = 560;
/** Life lost per frame (~0.8s at 60fps) — radius = (1 - life) * MAX_RADIUS. */
const BURST_DECAY = 0.024;
/** Half-width of the bright wavefront band, in CSS px. */
const BURST_BAND = 72;
/** Most concurrent shockwaves kept — extra hovers drop the oldest. */
const BURST_MAX = 4;

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
  // Data-saver clients skip the WebGL cost entirely and get the light 2D field
  // instead. Read as an external store rather than set into `unsupported` from
  // inside the effect: that was a setState in an effect body, and it also meant
  // the GL bootstrap was scheduled before the check could cancel it.
  const saveData = useSaveData();

  useEffect(() => {
    if (reduced || !isDesktop || saveData) return;

    // Defer the whole GL bootstrap — shader compile + node-graph build + first
    // frame — until the browser is idle, so the hero H1 (the LCP element) paints
    // first instead of competing with ~4kB of WebGL setup during hydration.
    // `teardown` is filled in once boot runs; the effect cleanup either cancels
    // the pending boot or tears down whatever it built.
    let teardown = () => {};
    let cancelled = false;

    const boot = () => {
      if (cancelled) return;

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
    // Eased tilt angles (radians) driven by the cursor. The shared vertex shader
    // rotates + perspective-projects the whole cloud by these — see lib/gl.ts.
    let tiltX = 0;
    let tiltY = 0;

    // Hero-exit scroll progress (0→1 across the hero's own height), written by
    // the shared scroll frame below; the render loop eases it into the recede.
    let heroExit = 0;
    // Per-frame recede, derived from heroExit in the loop and read by draw() and
    // the CPU proximity projection: view-z push (px) and the matching alpha fade.
    let recedeZ = 0;
    let recedeFade = 0;

    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -1e5;
      mouse.y = -1e5;
    };

    // Active CTA shockwaves. Each expands from its origin over its lifetime,
    // brightening nodes on the wavefront; empty in steady state, so the node
    // loop pays nothing when nobody is hovering a CTA.
    const bursts: { x: number; y: number; life: number }[] = [];

    const onBurst = (event: Event) => {
      for (let i = 0; i < BURST_SIZE; i++) pulses.push(spawnPulse());
      // Keep the steady-state population bounded.
      while (pulses.length > PULSE_COUNT + BURST_SIZE * 2) pulses.shift();

      // Record a shockwave origin (CTA centre → canvas coords) if one was sent.
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (detail) {
        const rect = canvas.getBoundingClientRect();
        bursts.push({ x: detail.x - rect.left, y: detail.y - rect.top, life: 1 });
        if (bursts.length > BURST_MAX) bursts.shift();
      }
    };

    // --- Vertex writers ---------------------------------------------------
    let vi = 0;
    const write = (
      target: Float32Array,
      x: number,
      y: number,
      dep: number,
      size: number,
      alpha: number,
      tint: number,
    ) => {
      target[vi] = x;
      target[vi + 1] = y;
      target[vi + 2] = dep;
      target[vi + 3] = size;
      target[vi + 4] = alpha;
      target[vi + 5] = tint;
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
      gl.uniform2f(program.uniforms.tilt, tiltX, tiltY);
      gl.uniform3f(program.uniforms.persp, DEPTH_MID, Z_RANGE, CAM_Z);
      gl.uniform2f(program.uniforms.recede, recedeZ, recedeFade);
      gl.uniform3fv(program.uniforms.base, WHITE);
      gl.uniform3fv(program.uniforms.accent, LIME);
      // Only the point shader declares u_dpr; on the line program the location
      // is null and this is a silent no-op.
      gl.uniform1f(program.uniforms.dpr, dpr);

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
      // Cursor → tilt angles (normalised to ±1 across the viewport, scaled to
      // MAX_TILT), eased so the volume glides rather than snaps. The GPU rotates
      // + perspective-projects by these; positions written below are raw model
      // space (no parallax fold), so nodes/links/pulses transform as one volume.
      const targetTiltX = hasCursor ? ((mouse.x - width / 2) / (width / 2)) * MAX_TILT : 0;
      const targetTiltY = hasCursor ? ((mouse.y - height / 2) / (height / 2)) * MAX_TILT : 0;
      tiltX += (targetTiltX - tiltX) * TILT_EASE;
      tiltY += (targetTiltY - tiltY) * TILT_EASE;

      // Ease hero-exit into the recede: hold at rest through the first sliver of
      // scroll (so the resting hero is untouched), then smoothstep the pull-back
      // and fade to full by RECEDE_END. recedeZ (px) drives both the shader's
      // z-push and the CPU proximity mirror below; recedeFade drives the alpha.
      const rt = Math.min(
        1,
        Math.max(0, (heroExit - RECEDE_START) / (RECEDE_END - RECEDE_START)),
      );
      recedeFade = rt * rt * (3 - 2 * rt);
      recedeZ = recedeFade * Z_RANGE * RECEDE_PUSH;

      // Trig for the CPU-side copy of the shader's rotation, hoisted out of the
      // node loop. u_tilt.x rotates about Y, u_tilt.y about X — mirror exactly.
      const sinY = Math.sin(tiltX), cosY = Math.cos(tiltX);
      const sinX = Math.sin(tiltY), cosX = Math.cos(tiltY);

      // Links -------------------------------------------------------------
      vi = 0;
      let lineVertexCount = 0;
      const maxLinkFloats = MAX_LINKS * 2 * STRIDE;

      for (let i = 0; i < nodeCount; i++) {
        forEachNeighbour(px[i], py[i], (j) => {
          if (j <= i || vi >= maxLinkFloats) return;

          // Measured in model space, so the link topology no longer shifts with
          // the cursor — the GPU tilt moves the drawn lines instead.
          const dx = px[i] - px[j];
          const dy = py[i] - py[j];
          const d2 = dx * dx + dy * dy;
          if (d2 >= LINK_DISTANCE * LINK_DISTANCE) return;

          const closeness = 1 - Math.sqrt(d2) / LINK_DISTANCE;
          const alpha = closeness * 0.15 * ((depth[i] + depth[j]) / 2);

          write(lineVerts, px[i], py[i], depth[i], 1, alpha, 0);
          write(lineVerts, px[j], py[j], depth[j], 1, alpha, 0);
          lineVertexCount += 2;
        });
      }

      // Pulse tails ride in the same buffer as the links.
      for (const pulse of pulses) {
        if (vi + 2 * STRIDE > lineVerts.length) break;

        const headT = pulse.t;
        const tailT = Math.max(0, headT - PULSE_TAIL);
        const fx = px[pulse.from], fy = py[pulse.from], fd = depth[pulse.from];
        const tx = px[pulse.to], ty = py[pulse.to], td = depth[pulse.to];

        write(lineVerts, fx + (tx - fx) * tailT, fy + (ty - fy) * tailT, fd + (td - fd) * tailT, 1, 0, 1);
        write(lineVerts, fx + (tx - fx) * headT, fy + (ty - fy) * headT, fd + (td - fd) * headT, 1, 0.75, 1);
        lineVertexCount += 2;
      }

      draw(lineProgram, lineVerts, lineVertexCount, gl.LINES, false);

      // Advance CTA shockwaves once per frame; drop any that have decayed.
      for (let b = bursts.length - 1; b >= 0; b--) {
        bursts[b].life -= BURST_DECAY;
        if (bursts[b].life <= 0) bursts.splice(b, 1);
      }

      // Nodes ---------------------------------------------------------------
      vi = 0;
      const interacting = hasCursor || bursts.length > 0;
      for (let i = 0; i < nodeCount; i++) {
        const mx = px[i];
        const my = py[i];

        // Highlight + shockwave test against the DRAWN position, so they stay
        // glued to each node under tilt. Projected only while interacting — in
        // steady state (no cursor, no burst) the loop pays nothing, and the raw
        // model coords go to the GPU either way (it re-projects). Mirrors the
        // projection in VERTEX_SHADER (lib/gl.ts); keep the two in sync.
        let near = 0;
        let wave = 0;
        if (interacting) {
          const cx = mx - width / 2;
          const cy = my - height / 2;
          const zz = (depth[i] - DEPTH_MID) * Z_RANGE;
          const rx = cx * cosY + zz * sinY;
          let rz = -cx * sinY + zz * cosY;
          const ry = cy * cosX - rz * sinX;
          rz = cy * sinX + rz * cosX;
          rz -= recedeZ; // mirror the shader's scroll recede so the highlight stays glued
          const w = CAM_Z / Math.max(CAM_Z - rz, 1);
          const dx = width / 2 + rx * w;
          const dy = height / 2 + ry * w;

          if (hasCursor && Math.hypot(mouse.x - dx, mouse.y - dy) < CURSOR_RADIUS) near = 1;

          for (const b of bursts) {
            const radius = (1 - b.life) * BURST_MAX_RADIUS;
            const prox = 1 - Math.min(1, Math.abs(Math.hypot(dx - b.x, dy - b.y) - radius) / BURST_BAND);
            if (prox > 0) wave = Math.max(wave, prox * b.life);
          }
        }

        const size = (near ? 5.2 : 3.2) * depth[i] * dpr * (1 + wave * 0.5);
        const alpha = near ? 0.95 : Math.min(0.95, 0.2 + 0.4 * depth[i] + wave * 0.6);
        // Push the wavefront toward lime; the cursor-near tint still wins.
        write(nodeVerts, mx, my, depth[i], size, alpha, Math.max(near, wave));
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

        const fx = px[pulse.from], fy = py[pulse.from], fd = depth[pulse.from];
        const tx = px[pulse.to], ty = py[pulse.to], td = depth[pulse.to];

        write(
          pulseVerts,
          fx + (tx - fx) * pulse.t,
          fy + (ty - fy) * pulse.t,
          fd + (td - fd) * pulse.t,
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

    // Hero-exit progress off the one shared scroll frame (lib/scroll.ts). This
    // is a write-only subscriber that does NO layout reads — `height` is the
    // canvas client height cached in resize() and refreshed by the resize
    // handler — and never calls setState; it only stores a scalar the render
    // loop already running reads. The recede itself is drawn in that loop, so
    // there is nothing to write per frame here.
    const unsubscribeScroll = subscribeToScroll((s) => {
      heroExit = height > 0 ? Math.min(1, Math.max(0, s.y / height)) : 0;
    });

    frame();

      teardown = () => {
        io.disconnect();
        unsubscribeScroll();
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
    };

    // Kick the boot off the critical path: run it when the browser is idle
    // (post-LCP), falling back to a short timeout where requestIdleCallback is
    // unavailable. The cleanup cancels a still-pending boot, or tears down what
    // it built.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle
      ? window.requestIdleCallback(boot, { timeout: 1200 })
      : window.setTimeout(boot, 200);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
      teardown();
    };
  }, [reduced, isDesktop, saveData]);

  if (reduced) return null;
  // Below 760px the GPU network is too heavy for the battery, so the hero gets the
  // lighter 2D field instead — dimmed, so it reads as texture rather than a bare
  // black panel. Naturally sparse at phone dimensions (area-scaled node count).
  if (!isDesktop) return <ParticleField dim />;
  // No WebGL context, or the client asked us not to spend their data on one.
  if (unsupported || saveData) return <ParticleField />;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 h-full w-full"
    />
  );
}
