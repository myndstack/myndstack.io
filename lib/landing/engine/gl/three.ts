/**
 * The only module that imports three.js (ESLint-enforced, like lib/motion/anime/*).
 *
 * Named re-exports only — never `import * as THREE` and never an addon from
 * `three/addons` / `three/examples` (they import the package root and defeat
 * tree-shaking). Add a name here when the renderer genuinely needs it; the
 * engine chunk has a hard budget (scripts/bundle-budget.mjs --engine).
 *
 * The renderer uses three as a thin WebGL2 layer: raw GLSL3 programs with its
 * own camera matrices (lib/landing/engine/camera.ts), so no built-in
 * material, light or camera logic runs.
 */
export {
  BufferAttribute,
  BufferGeometry,
  Camera,
  DepthTexture,
  DoubleSide,
  FrontSide,
  LineSegments,
  Mesh,
  NearestFilter,
  RawShaderMaterial,
  Scene,
  UnsignedByteType,
  UnsignedIntType,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
