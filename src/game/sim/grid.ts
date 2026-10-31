// Tile queries, line of sight, shadow and paths. All pure, all on the map alone.
import { LAVA, ROCK } from "./types";
import type { StageMap, Vec } from "./types";

type Grid = Pick<StageMap, "width" | "height" | "tiles">;

export function tileAt(map: Grid, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return ROCK;
  return map.tiles[ty * map.width + tx]!;
}

export function isSolid(tile: number): boolean {
  return tile === ROCK || tile === LAVA;
}

export function isPassable(map: Grid, x: number, y: number): boolean {
  return !isSolid(tileAt(map, x, y));
}

/** True if a rock stands between this point and the Eye, within the stage's shadow length. */
export function inShadow(map: StageMap, x: number, y: number): boolean {
  const dx = map.origin.x - x;
  const dy = map.origin.y - y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  for (let along = 0.4; along <= map.shadowLength; along += 0.4) {
    if (tileAt(map, x + ux * along, y + uy * along) === ROCK) return true;
  }
  return false;
}

export function bearingFromEye(map: StageMap, x: number, y: number): number {
  return Math.atan2(y - map.origin.y, x - map.origin.x);
}

export function hasLineOfSight(map: Grid, a: Vec, b: Vec): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.ceil(Math.hypot(dx, dy) / 0.25);
  for (let i = 1; i < steps; i += 1) {
    if (tileAt(map, a.x + (dx * i) / steps, a.y + (dy * i) / steps) === ROCK) return false;
  }
  return true;
}

/** Shortest wrapped difference, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta <= -Math.PI) delta += Math.PI * 2;
  return delta;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Steps from every tile to `target`; -1 where unreachable. Diagonals may not cut a corner. */
export function distanceField(map: Grid, target: Vec): Int32Array {
  const { width, height } = map;
  const field = new Int32Array(width * height).fill(-1);
  const startX = Math.floor(target.x);
  const startY = Math.floor(target.y);
  if (!isPassable(map, startX, startY)) return field;
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const first = startY * width + startX;
  field[first] = 0;
  queue[tail++] = first;
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % width;
    const y = (index - x) / width;
    const nextStep = field[index]! + 1;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nextIndex = ny * width + nx;
      if (field[nextIndex] !== -1 || isSolid(map.tiles[nextIndex]!)) continue;
      if (dx !== 0 && dy !== 0 && (isSolid(map.tiles[y * width + nx]!) || isSolid(map.tiles[ny * width + x]!))) continue;
      field[nextIndex] = nextStep;
      queue[tail++] = nextIndex;
    }
  }
  return field;
}

/** Tile centres from just after `from` to `to`, or [] if there is no way. */
export function findPath(map: Grid, from: Vec, to: Vec): Vec[] {
  const { width } = map;
  const field = distanceField(map, to);
  let x = Math.floor(from.x);
  let y = Math.floor(from.y);
  let distance = isPassable(map, x, y) ? field[y * width + x]! : -1;
  const path: Vec[] = [];
  if (distance < 0) return path;
  while (distance > 0) {
    let bestX = x;
    let bestY = y;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= map.height) continue;
      if (field[ny * width + nx] !== distance - 1) continue;
      if (dx !== 0 && dy !== 0 && (isSolid(map.tiles[y * width + nx]!) || isSolid(map.tiles[ny * width + x]!))) continue;
      bestX = nx;
      bestY = ny;
      break;
    }
    x = bestX;
    y = bestY;
    distance -= 1;
    path.push({ x: x + 0.5, y: y + 0.5 });
  }
  return path;
}
