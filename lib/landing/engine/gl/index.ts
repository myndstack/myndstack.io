/**
 * Entry of the landing engine's lazy chunk — the only chunk that carries
 * three.js. P0 spike: proves the chunk budget, WebGL2 under SwiftShader and
 * that the context survives moving the canvas between hosts. The real
 * renderer (P3) replaces the body; the entry point and marker stay.
 */
import { Mesh, PerspectiveCamera, Scene, ShaderMaterial, TorusGeometry, WebGLRenderer } from "./three";

// Budget marker: scripts/bundle-budget.mjs --engine finds the engine chunk by
// this string, and e2e tests assert the module never evaluates in poster mode.
performance.mark("engine:module-eval");

export type SpikeStats = {
  readonly frames: number;
  readonly calls: number;
  readonly triangles: number;
  readonly lost: boolean;
  readonly webgl2: boolean;
};

export type SpikeHandle = {
  readonly render: () => void;
  readonly resize: (width: number, height: number, dpr: number) => void;
  readonly stats: () => SpikeStats;
  readonly dispose: () => void;
};

const VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float light = 0.35 + 0.65 * max(dot(vNormal, normalize(vec3(0.4, 0.8, 1.0))), 0.0);
    gl_FragColor = vec4(vec3(0.79, 0.95, 0.30) * light, 1.0);
  }
`;

export function createSpike(canvas: HTMLCanvasElement): SpikeHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(24, 1, 0.1, 50);
  camera.position.set(0, 0, 9);
  const geometry = new TorusGeometry(1.6, 0.18, 24, 160);
  const material = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new Mesh(geometry, material);
  mesh.rotation.set(0.5, -0.3, 0);
  scene.add(mesh);

  let frames = 0;
  const render = () => {
    renderer.render(scene, camera);
    frames += 1;
  };

  return {
    render,
    resize: (width, height, dpr) => {
      renderer.setPixelRatio(Math.min(dpr, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    },
    stats: () => ({
      frames,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      lost: renderer.getContext().isContextLost(),
      webgl2: typeof WebGL2RenderingContext !== "undefined" && renderer.getContext() instanceof WebGL2RenderingContext,
    }),
    dispose: () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
