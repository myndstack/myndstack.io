/**
 * The director, live half (lazy): the critically damped spring between the
 * page's scroll and the object, the camera (shared with every DOM overlay),
 * the modifiers (the studio switch, pointer lean, the idle loops, the boot)
 * and the renderer. Renders on demand: while the spring moves, a develop
 * runs or idle motion is allowed; still and quiet, the loop stops.
 *
 * It reads the boot half's state each frame (the timeline, the raw scroll,
 * the fronts' split) and writes only the overlays' geometry, on change.
 */
import { FACE_R, buildCamera, projectCircle } from "@/lib/landing/engine/camera";
import { samplePose, withEases, type Resolved } from "@/lib/landing/engine/choreography";
import { R_BORE, rig } from "@/lib/landing/engine/rig";
import { frameDue, schedule } from "@/lib/landing/engine/schedule";
import { rgba } from "@/lib/landing/engine/skins";
import { SPRING_OMEGA, isSettled, springStep, type SpringState } from "@/lib/landing/engine/spring";
import { engineSignals } from "@/lib/landing/engine/store";
import { tierParams } from "@/lib/landing/engine/tiers";
import { CH, POSE_LEN, type QualityTier } from "@/lib/landing/engine/types";
import { SPECTRUM } from "@/lib/motion/tokens";

import type { DirectorState, LiveHandle } from "./boot";
import { createWriter } from "./writes";

const IDLE_SLEEP_MS = 12_000;
/** The forge boot: the face draws on, then the halo comes up. */
const BOOT_MS = 1600;
const DEG = Math.PI / 180;

export async function startLive(
  { state, root }: { readonly state: DirectorState; readonly root: HTMLElement },
  tier: QualityTier,
): Promise<LiveHandle | null> {
  const stage = root.querySelector<HTMLElement>("[data-engine-stage]");
  const canvas = stage?.querySelector<HTMLCanvasElement>("canvas.stage-canvas");
  if (!stage || !canvas || tier === "poster") return null;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const params = tierParams(tier, coarse);
  const gl = await import("@/lib/landing/engine/gl");
  const engine = gl.createEngine(canvas, { lod: params.lod, hiddenLines: params.hiddenLines, scaleCap: params.dprCap, maxPixels: 4.2e6 });
  if (!engine) return null;

  const w = createWriter();
  const omega = coarse ? SPRING_OMEGA.coarse : SPRING_OMEGA.fine;
  const pose = new Float32Array(POSE_LEN);
  let spring: SpringState = { x: state.y, v: 0 };
  let raf = 0;
  let last = 0;
  let lastFrame = 0;
  let lastInput = performance.now();
  let first = true;
  const t0 = performance.now();
  // The studio switch: a quick spring toward the signal's alignment.
  let align = engineSignals.get("studio.mode") === "agency" ? 0 : 1;
  // Pointer lean, smoothed.
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };

  const resize = () => engine.resize(document.documentElement.clientWidth, window.innerHeight, window.devicePixelRatio || 1);
  resize();

  // The travels' eases, built once per layout (the boot half places the beats without them).
  let eased: { readonly from: DirectorState["layout"]; readonly res: Resolved } | null = null;
  const timeline = (L: NonNullable<DirectorState["layout"]>): Resolved => {
    if (eased?.from !== L) eased = { from: L, res: withEases(L.res) };
    return eased.res;
  };

  const covered = () => {
    const L = state.layout;
    if (!L) return true;
    return L.sheets.some((s) => s.top <= state.y && s.bottom >= state.y + L.vh);
  };

  const loop = (now: number) => {
    raf = 0;
    const L = state.layout;
    if (!L) return;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    // A jump across scenes snaps (the page itself was jumped, not scrolled).
    spring = Math.abs(state.y - spring.x) > 3 * L.vh ? { x: state.y, v: 0 } : springStep(spring, state.y, omega, dt, 0.6 * L.vh);
    samplePose(timeline(L), spring.x, pose);

    const target = engineSignals.get("studio.mode") === "agency" ? 0 : 1;
    align += (target - align) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - align) < 0.001) align = target;
    pose[CH.align] = Math.min(pose[CH.align], align);

    lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 5));
    lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 5));
    pose[CH.yaw] += lean.x * 5 * pose[CH.lean];
    pose[CH.pitch] += lean.y * 3 * pose[CH.lean];

    const boot = Math.min(1, (now - t0) / BOOT_MS);
    const drawOn = 1 - (1 - boot) ** 3;
    pose[CH.draw] = Math.min(pose[CH.draw], drawOn);
    pose[CH.haze] *= drawOn;

    const r = rig(pose);
    const cam = buildCamera({
      yaw: pose[CH.yaw],
      pitch: pose[CH.pitch],
      fov: pose[CH.fov],
      circle: pose[CH.circle],
      sphere: r.sphere,
      face: r.face,
      target: { cx: pose[CH.cx], cy: pose[CH.cy], r: pose[CH.cr] },
      canvas: { w: L.vw, h: L.vh },
    });
    const visible = !document.hidden && !covered();
    if (cam && visible) {
      const t = (now - t0) / 1000;
      const idle = pose[CH.ambient] > 0.5 && document.documentElement.dataset.paused === undefined;
      const a = rgba(SPECTRUM[state.accent]);
      engine.render({
        pose,
        camera: cam,
        time: t,
        split: state.split,
        ink: state.ink,
        accent: [a[0], a[1], a[2]],
        idle: idle
          ? { bezel: t * 1.2 * DEG, iface: -t * 0.6 * DEG, gear: t * 3 * DEG, core: t * 12 * DEG }
          : { bezel: 0, iface: 0, gear: 0, core: 0 },
      });
      // The overlays ride the face: the demos, the document fan, the chamber's iris.
      const face = projectCircle(cam, r.face, r.axis, FACE_R);
      if (face) {
        const rr = (face.rx + face.ry) / 2;
        w.prop(stage, "--ex", `${face.cx.toFixed(1)}px`);
        w.prop(stage, "--ey", `${face.cy.toFixed(1)}px`);
        w.prop(stage, "--er", `${rr.toFixed(1)}px`);
        w.prop(stage, "--bx", `${face.cx.toFixed(1)}px`);
        w.prop(stage, "--by", `${face.cy.toFixed(1)}px`);
        w.prop(stage, "--br", `${(rr * (R_BORE / FACE_R) * pose[CH.portal]).toFixed(1)}px`);
      }
      if (first) {
        first = false;
        stage.dataset.live = "";
      }
    }

    const moving = !isSettled(spring, state.y) || state.developing || boot < 1 || Math.abs(target - align) > 0.001 || Math.abs(lean.tx - lean.x) > 0.002;
    const decision = schedule({
      visible,
      moving,
      ambient: pose[CH.ambient] > 0.5 && document.documentElement.dataset.paused === undefined,
      sinceInputMs: now - lastInput,
      idleSleepMs: IDLE_SLEEP_MS,
      ambientFps: params.ambientFps,
    });
    if (decision.run) {
      raf = requestAnimationFrame(decision.fps === 60 || frameDue(lastFrame, now, decision.fps) ? stamp : skip);
    }
  };
  const stamp = (now: number) => {
    lastFrame = now;
    loop(now);
  };
  const skip = (now: number) => {
    raf = 0;
    raf = requestAnimationFrame(frameDue(lastFrame, now, params.ambientFps) ? stamp : skip);
  };

  const wake = () => {
    lastInput = performance.now();
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(stamp);
    }
  };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    lean.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    lean.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    wake();
  };
  const onVisibility = () => {
    if (!document.hidden) wake();
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  wake();

  return {
    wake,
    relayout: () => {
      resize();
      wake();
    },
    dispose: () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
      delete stage.dataset.live;
      w.reset();
    },
  };
}
