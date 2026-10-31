// The ash under the survey: one raster, painted once per visit. It uses the raw palette because
// canvas pixels cannot crossfade with the semantic tokens; `--ring-media-filter` drains it instead.
import type { MapPoint } from "../../content/atlas";
import { createRng } from "../_shared/rng";
import { landOutline, nurnenOutline, rangePolylines } from "./terrain";
import { SHEET } from "./view";

type Rgb = [number, number, number];

const SIZE = 1024;
const FIELD = 128;
const TABLE = 256;
const SLICE_MS = 8;

function readColour(styles: CSSStyleDeclaration, name: string): Rgb | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(styles.getPropertyValue(name).trim());
  if (!match) return null;
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)];
}

function inside(point: MapPoint, polygon: MapPoint[]): boolean {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      within = !within;
    }
  }
  return within;
}

function distanceToPolyline(point: MapPoint, line: MapPoint[]): number {
  let best = Infinity;
  for (const vertex of line) best = Math.min(best, Math.hypot(point.x - vertex.x, point.y - vertex.y));
  return best;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createNoise(): (x: number, y: number) => number {
  const rng = createRng(1441);
  const table = Float32Array.from({ length: TABLE * TABLE }, () => rng());
  const mask = TABLE - 1;
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => table[((b & mask) << 8) | (a & mask)]!;
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * u;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * u;
    return top + (bottom - top) * v;
  };
}

/** Coarse precomputed masks: land, sea and distance to the walls. Bilinear on read. */
function buildField(): { land: Float32Array; sea: Float32Array; wall: Float32Array } {
  const landPolygon = landOutline();
  const seaPolygon = nurnenOutline();
  const walls = rangePolylines();
  const count = FIELD + 1;
  const land = new Float32Array(count * count);
  const sea = new Float32Array(count * count);
  const wall = new Float32Array(count * count);
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      const point = { x: (col / FIELD) * SHEET, y: (row / FIELD) * SHEET };
      const index = row * count + col;
      land[index] = inside(point, landPolygon) ? 1 : 0;
      sea[index] = inside(point, seaPolygon) ? 1 : 0;
      wall[index] = Math.min(...walls.map((line) => distanceToPolyline(point, line)));
    }
  }
  return { land, sea, wall };
}

function sample(field: Float32Array, x: number, y: number): number {
  const count = FIELD + 1;
  const fx = Math.min(FIELD - 0.001, (x / SHEET) * FIELD);
  const fy = Math.min(FIELD - 0.001, (y / SHEET) * FIELD);
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const a = field[iy * count + ix]!;
  const b = field[iy * count + ix + 1]!;
  const c = field[(iy + 1) * count + ix]!;
  const d = field[(iy + 1) * count + ix + 1]!;
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

interface Glow {
  x: number;
  y: number;
  radius: number;
  strength: number;
}

/**
 * Paints in slices of a few milliseconds and shows the sheet when done, so the raster never holds
 * up the page. Returns a cancel function for unmount.
 */
export function paintGround(canvas: HTMLCanvasElement, glows: Glow[]): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;
  const styles = getComputedStyle(document.documentElement);
  const deep = readColour(styles, "--iron-950");
  const floor = readColour(styles, "--iron-900");
  const plate = readColour(styles, "--iron-800");
  const slag = readColour(styles, "--iron-600");
  const ash = readColour(styles, "--ash-500");
  const ember = readColour(styles, "--ember-500");
  if (!deep || !floor || !plate || !slag || !ash || !ember) return () => undefined;

  canvas.width = SIZE;
  canvas.height = SIZE;
  const image = context.createImageData(SIZE, SIZE);
  const { data } = image;
  const noise = createNoise();
  let field: ReturnType<typeof buildField> | null = null;

  const fbm = (x: number, y: number) =>
    noise(x, y) * 0.5 + noise(x * 2.1, y * 2.1) * 0.27 + noise(x * 4.3, y * 4.3) * 0.15 + noise(x * 8.7, y * 8.7) * 0.08;

  const paintRow = (py: number, { land, sea, wall }: ReturnType<typeof buildField>): void => {
    for (let px = 0; px < SIZE; px += 1) {
      const x = (px / SIZE) * SHEET;
      const y = (py / SIZE) * SHEET;
      const clouds = fbm(x * 0.012, y * 0.012);
      const grit = noise(x * 0.9, y * 0.9);
      // Ash is laid by the wind, in long streaks running east and a little south.
      const streak = noise((x + y * 0.3) * 0.006, (y - x * 0.12) * 0.11);

      const within = smoothstep(0.2, 0.8, sample(land, x, y));
      const nearWall = 1 - smoothstep(10, 90, sample(wall, x, y));
      const plateau = 1 - smoothstep(0.55, 1.15, Math.hypot((x - 470) / 215, (y - 440) / 150));
      const fields = smoothstep(560, 720, y) * within;

      let r = deep[0] + (floor[0] - deep[0]) * clouds;
      let g = deep[1] + (floor[1] - deep[1]) * clouds;
      let b = deep[2] + (floor[2] - deep[2]) * clouds;

      const ground = within * (0.6 + clouds * 0.8) * (1 - nearWall * 0.72);
      r += (plate[0] - r) * ground;
      g += (plate[1] - g) * ground;
      b += (plate[2] - b) * ground;

      const ashFall = within * plateau * (0.1 + streak * streak * 0.42);
      r += (slag[0] - r) * ashFall + (grit > 0.7 ? plateau * within * 5 : 0);
      g += (slag[1] - g) * ashFall + (grit > 0.7 ? plateau * within * 5 : 0);
      b += (slag[2] - b) * ashFall + (grit > 0.7 ? plateau * within * 4 : 0);

      const tilth = fields * smoothstep(0.42, 0.7, noise(x * 0.05, y * 0.32)) * 0.22;
      r += (slag[0] - r) * tilth;
      g += (slag[1] - g) * tilth;
      b += (slag[2] - b) * tilth;

      const water = smoothstep(0.35, 0.65, sample(sea, x, y));
      if (water > 0) {
        const sheen = noise(x * 0.02, y * 0.14) * 0.16;
        r += (deep[0] - r) * water * (1 - sheen) + ash[0] * water * sheen * 0.1;
        g += (deep[1] - g) * water * (1 - sheen) + ash[1] * water * sheen * 0.1;
        b += (deep[2] - b) * water * (1 - sheen) + ash[2] * water * sheen * 0.1;
      }

      for (const glow of glows) {
        const distance = Math.hypot(x - glow.x, (y - glow.y) * 1.25);
        const heat = (glow.strength / (1 + (distance / glow.radius) ** 2.4)) * (0.72 + clouds * 0.5);
        r += ember[0] * heat;
        g += ember[1] * heat;
        b += ember[2] * heat;
      }

      const speck = (grit - 0.5) * 7;
      const index = (py * SIZE + px) * 4;
      data[index] = r + speck;
      data[index + 1] = g + speck;
      data[index + 2] = b + speck;
      data[index + 3] = 255;
    }
  };

  let row = 0;
  let frame = 0;
  const slice = (): void => {
    field ??= buildField();
    const started = performance.now();
    while (row < SIZE && performance.now() - started < SLICE_MS) {
      paintRow(row, field);
      row += 1;
    }
    if (row < SIZE) {
      frame = requestAnimationFrame(slice);
      return;
    }
    context.putImageData(image, 0, 0);
    canvas.dataset.painted = "";
  };
  frame = requestAnimationFrame(slice);
  return () => cancelAnimationFrame(frame);
}
