import { EYE_FRAGMENT, EYE_VERTEX } from "./eye.frag";

export interface EyeFrame {
  time: number;
  gazeX: number;
  gazeY: number;
  attention: number; // 0-1
  ring: number; // 0-1
}

export interface EyeRenderer {
  draw(frame: EyeFrame): void;
  resize(cssWidth: number, cssHeight: number, pixelRatio: number): void;
  dispose(): void;
}

const PALETTE = {
  uIron: "--iron-950",
  uWax: "--wax-700",
  uEmber: "--ember-500",
  uEye: "--eye",
  uHeat: "--heat-200",
} as const;

function tokenColor(name: string): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().slice(1);
  const value = Number.parseInt(hex, 16) || 0;
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/** Returns null when WebGL or the shader is unavailable; the caller shows the static Eye. */
export function createEyeRenderer(canvas: HTMLCanvasElement): EyeRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, EYE_VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, EYE_FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const at = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    center: at("uCenter"),
    scale: at("uScale"),
    time: at("uTime"),
    gaze: at("uGaze"),
    attention: at("uAttention"),
    ring: at("uRing"),
  };
  for (const [uniform, token] of Object.entries(PALETTE)) {
    gl.uniform3fv(at(uniform), tokenColor(token));
  }

  return {
    resize(cssWidth, cssHeight, pixelRatio) {
      const width = Math.max(1, Math.round(cssWidth * pixelRatio));
      const height = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0, 0, width, height);
      const portrait = height > width;
      gl.uniform2f(uniforms.center, width * 0.5, height * (portrait ? 0.64 : 0.62));
      gl.uniform1f(uniforms.scale, portrait ? Math.min(width * 0.56, height * 0.3) : Math.min(width * 0.24, height * 0.4));
    },
    draw({ time, gazeX, gazeY, attention, ring }) {
      gl.uniform1f(uniforms.time, time);
      gl.uniform2f(uniforms.gaze, gazeX, gazeY);
      gl.uniform1f(uniforms.attention, attention);
      gl.uniform1f(uniforms.ring, ring);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
