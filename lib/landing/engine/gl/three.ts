/**
 * The only module that imports three.js (ESLint-enforced, like lib/motion/anime/*).
 *
 * Named re-exports only — never `import * as THREE` and never an addon from
 * `three/addons` / `three/examples` (they import the package root and defeat
 * tree-shaking). Add a name here when the renderer genuinely needs it; the
 * engine chunk has a hard budget (scripts/bundle-budget.mjs --engine).
 */
export {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  WebGLRenderer,
} from "three";
