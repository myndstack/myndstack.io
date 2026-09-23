/**
 * SVG helpers. Deliberately only `morphTo`, and only ever with precision 0
 * (it then just reads the two `d` strings). `createDrawable` and
 * `createMotionPath` are not exported: both measure the path in the browser
 * (getTotalLength / getPointAtLength), which the landing never does — lines
 * draw via pathLength="1" + dashoffset and paths are precomputed in
 * lib/motion/paths.ts. See ./core.ts for the import rules.
 */
export { morphTo } from "animejs/svg";
