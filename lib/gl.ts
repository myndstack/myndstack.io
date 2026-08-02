"use client";

/**
 * Minimal WebGL helpers for the hero network. Deliberately not a library —
 * the whole renderer is two programs and one interleaved buffer.
 */

export type GL = WebGLRenderingContext;

/**
 * Shared vertex shader. Positions arrive in CSS pixels (raw model space — the
 * CPU no longer folds parallax in) with a per-vertex depth in 0.35..1. The GPU
 * lifts each vertex to a view-space z, rotates the whole cloud toward the cursor
 * by the eased `u_tilt` angles, perspective-divides, and maps back to clip space
 * — so nodes, links and pulses all project through one transform and stay glued
 * together as a single rotating volume.
 *
 * At `u_tilt == 0` a mid-depth vertex (z == 0, w == 1) reduces to the old flat
 * projection `clip = a_pos / u_res * 2 - 1` exactly, so the resting frame barely
 * moves; only depth-separated nodes gain a gentle perspective offset.
 */
export const VERTEX_SHADER = `
attribute vec2 a_pos;
attribute float a_depth;
attribute float a_size;
attribute float a_alpha;
attribute float a_tint;

uniform vec2 u_res;
uniform vec2 u_tilt;  // radians: (rotation about Y, rotation about X)
uniform vec3 u_persp; // (depthMid, zRange px, camZ px) — one source in HeroNetwork.tsx

varying float v_alpha;
varying float v_tint;
varying float v_size;

void main() {
  // Centre on screen, then lift depth into a view-space z. The cloud is centred
  // on the mid-depth plane (u_persp.x) so at tilt 0 a mid-depth vertex has z==0.
  vec2 c = a_pos - u_res * 0.5;
  float z = (a_depth - u_persp.x) * u_persp.y;
  vec3 P = vec3(c, z);

  // Rotate the whole cloud about Y then X by the eased tilt angles.
  float sinY = sin(u_tilt.x), cosY = cos(u_tilt.x);
  float sinX = sin(u_tilt.y), cosX = cos(u_tilt.y);
  float rx =  P.x * cosY + P.z * sinY;
  float rz = -P.x * sinY + P.z * cosY;
  float ry =  P.y * cosX - rz * sinX;
  rz       =  P.y * sinX + rz * cosX;

  // Perspective divide. The denominator stays positive because camZ (~1500)
  // dwarfs the largest rotated z — roughly |x|*sin(tilt) + zRange + |y|*sin(tilt),
  // a few hundred px on real viewports at a small MAX_TILT. max() is a
  // belt-and-braces clamp; a large enough MAX_TILT/zRange (or a ~16k-px-wide
  // viewport) is what would push rz toward camZ, so those are kept small.
  float w = u_persp.z / max(u_persp.z - rz, 1.0);
  vec2 proj = vec2(rx, ry) * w;

  // proj is centred on the origin, so half-res maps it to clip [-1, 1].
  vec2 clip = proj / (u_res * 0.5);
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size;
  v_alpha = a_alpha;
  v_tint = a_tint;
  v_size = a_size;
}
`;

/**
 * Round, soft-edged nodes. `v_tint` blends white → lime per vertex.
 *
 * Output is premultiplied (rgb × a) because the canvas is transparent and sits
 * over the page — with unpremultiplied output the compositor darkens everything
 * translucent, which washes the link mesh out entirely.
 */
export const POINT_FRAGMENT_SHADER = `
precision mediump float;

uniform vec3 u_base;
uniform vec3 u_accent;
uniform float u_dpr;

varying float v_alpha;
varying float v_tint;
varying float v_size;

void main() {
  float r = length(gl_PointCoord - 0.5);
  // Volumetric depth-of-field: the smoothstep's inner edge scales with the
  // node's on-screen size (a depth proxy), so near/large nodes stay crisp and
  // far/small nodes bloom into soft bokeh discs. Divide by dpr so the focus
  // band is in CSS px and reads the same on retina. Prominent nodes land at
  // ~0.34 (≈ the previous crisp 0.32); only genuinely small far nodes soften.
  float sizePx = v_size / max(u_dpr, 1.0);
  float focus = clamp((sizePx - 1.0) / 3.5, 0.0, 1.0);
  float inner = mix(0.08, 0.34, focus);
  float a = smoothstep(0.5, inner, r) * v_alpha;
  gl_FragColor = vec4(mix(u_base, u_accent, v_tint) * a, a);
}
`;

/** Flat lines — gl_PointCoord is undefined for LINES, so it is never read. */
export const LINE_FRAGMENT_SHADER = `
precision mediump float;

uniform vec3 u_base;
uniform vec3 u_accent;

varying float v_alpha;
varying float v_tint;

void main() {
  gl_FragColor = vec4(mix(u_base, u_accent, v_tint) * v_alpha, v_alpha);
}
`;

function compile(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export type Program = {
  program: WebGLProgram;
  attributes: { pos: number; depth: number; size: number; alpha: number; tint: number };
  uniforms: {
    res: WebGLUniformLocation | null;
    /** Eased cursor tilt (radians) — read by the shared vertex shader. */
    tilt: WebGLUniformLocation | null;
    /** Perspective params (depthMid, zRange, camZ) — shared vertex shader. */
    persp: WebGLUniformLocation | null;
    base: WebGLUniformLocation | null;
    accent: WebGLUniformLocation | null;
    /** Device pixel ratio — only read by the point shader's bokeh falloff. */
    dpr: WebGLUniformLocation | null;
  };
};

export function createProgram(gl: GL, fragmentSource: string): Program | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  // The shaders are owned by the program once linked.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program failed to link:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return {
    program,
    attributes: {
      pos: gl.getAttribLocation(program, "a_pos"),
      depth: gl.getAttribLocation(program, "a_depth"),
      size: gl.getAttribLocation(program, "a_size"),
      alpha: gl.getAttribLocation(program, "a_alpha"),
      tint: gl.getAttribLocation(program, "a_tint"),
    },
    uniforms: {
      res: gl.getUniformLocation(program, "u_res"),
      tilt: gl.getUniformLocation(program, "u_tilt"),
      persp: gl.getUniformLocation(program, "u_persp"),
      base: gl.getUniformLocation(program, "u_base"),
      accent: gl.getUniformLocation(program, "u_accent"),
      // Absent from the line program (its fragment never declares it) — that
      // just yields null, and setting a null uniform location is a no-op.
      dpr: gl.getUniformLocation(program, "u_dpr"),
    },
  };
}

/** Floats per vertex: x, y, depth, size, alpha, tint. */
export const STRIDE = 6;
const BYTES = STRIDE * Float32Array.BYTES_PER_ELEMENT;

/** Points the shared interleaved layout at whichever program is current. */
export function bindAttributes(gl: GL, { attributes }: Program) {
  const { pos, depth, size, alpha, tint } = attributes;

  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, BYTES, 0);

  gl.enableVertexAttribArray(depth);
  gl.vertexAttribPointer(depth, 1, gl.FLOAT, false, BYTES, 8);

  gl.enableVertexAttribArray(size);
  gl.vertexAttribPointer(size, 1, gl.FLOAT, false, BYTES, 12);

  gl.enableVertexAttribArray(alpha);
  gl.vertexAttribPointer(alpha, 1, gl.FLOAT, false, BYTES, 16);

  gl.enableVertexAttribArray(tint);
  gl.vertexAttribPointer(tint, 1, gl.FLOAT, false, BYTES, 20);
}
