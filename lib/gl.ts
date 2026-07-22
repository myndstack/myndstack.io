"use client";

/**
 * Minimal WebGL helpers for the hero network. Deliberately not a library —
 * the whole renderer is two programs and one interleaved buffer.
 */

export type GL = WebGLRenderingContext;

/**
 * Shared vertex shader. Positions arrive in CSS pixels — the CPU has already
 * folded depth parallax into them — and are converted to clip space here.
 */
export const VERTEX_SHADER = `
attribute vec2 a_pos;
attribute float a_size;
attribute float a_alpha;
attribute float a_tint;

uniform vec2 u_res;

varying float v_alpha;
varying float v_tint;

void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size;
  v_alpha = a_alpha;
  v_tint = a_tint;
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

varying float v_alpha;
varying float v_tint;

void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.32, r) * v_alpha;
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
  attributes: { pos: number; size: number; alpha: number; tint: number };
  uniforms: {
    res: WebGLUniformLocation | null;
    base: WebGLUniformLocation | null;
    accent: WebGLUniformLocation | null;
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
      size: gl.getAttribLocation(program, "a_size"),
      alpha: gl.getAttribLocation(program, "a_alpha"),
      tint: gl.getAttribLocation(program, "a_tint"),
    },
    uniforms: {
      res: gl.getUniformLocation(program, "u_res"),
      base: gl.getUniformLocation(program, "u_base"),
      accent: gl.getUniformLocation(program, "u_accent"),
    },
  };
}

/** Floats per vertex: x, y, size, alpha, tint. */
export const STRIDE = 5;
const BYTES = STRIDE * Float32Array.BYTES_PER_ELEMENT;

/** Points the shared interleaved layout at whichever program is current. */
export function bindAttributes(gl: GL, { attributes }: Program) {
  const { pos, size, alpha, tint } = attributes;

  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, BYTES, 0);

  gl.enableVertexAttribArray(size);
  gl.vertexAttribPointer(size, 1, gl.FLOAT, false, BYTES, 8);

  gl.enableVertexAttribArray(alpha);
  gl.vertexAttribPointer(alpha, 1, gl.FLOAT, false, BYTES, 12);

  gl.enableVertexAttribArray(tint);
  gl.vertexAttribPointer(tint, 1, gl.FLOAT, false, BYTES, 16);
}
