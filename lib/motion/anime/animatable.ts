/**
 * anime's Animatable — a property that eases toward whatever value it's last
 * given. Used for pointer-following motion (the Core's lean), never for the
 * scrub (see lib/motion/smooth.ts for why). See ./core.ts for the rules.
 */
export { createAnimatable } from "animejs/animatable";
