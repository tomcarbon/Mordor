// Stage generation. Each stage is built around its own idea of terrain, then checked: if the exit
// or a water skin cannot be reached, the seed is salted and the stage is built again.
import { distanceField, findPath, isPassable } from "./grid";
import { createRng, mixSeed, random, randomInt, randomRange } from "./rng";
import type { Rng } from "./rng";
import { STAGE_TUNING } from "./tuning";
import type { StageTuning } from "./tuning";
import { FLOOR, LAVA, PIT, ROCK, STAGE_IDS, THORN, WEB } from "./types";
import type { Patrol, PatrolKind, Pickup, StageKey, StageMap, Vec } from "./types";

export interface GeneratedStage {
  map: StageMap;
  patrols: Patrol[];
  pickups: Pickup[];
}

interface Canvas {
  width: number;
  height: number;
  tiles: number[];
}

/** Patrol plan: a walk through these points, closed into a loop, with `count` walkers on it. */
interface RoutePlan {
  kind: PatrolKind;
  points: Vec[];
  count: number;
}

interface Layout {
  grid: Canvas;
  start: Vec;
  exit: Vec;
  routes: RoutePlan[];
  water: number;
}

function blank(width: number, height: number, fill: number): Canvas {
  return { width, height, tiles: new Array<number>(width * height).fill(fill) };
}

function setTile(grid: Canvas, x: number, y: number, tile: number): void {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return;
  grid.tiles[y * grid.width + x] = tile;
}

function getTile(grid: Canvas, x: number, y: number): number {
  return grid.tiles[y * grid.width + x]!;
}

function blob(grid: Canvas, rng: Rng, cx: number, cy: number, rx: number, ry: number, tile: number, only?: number): void {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x += 1) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1 + (random(rng) - 0.5) * 0.45) continue;
      if (only !== undefined && (x < 0 || y < 0 || x >= grid.width || y >= grid.height || getTile(grid, x, y) !== only)) continue;
      setTile(grid, x, y, tile);
    }
  }
}

/** A wandering corridor from a to b, `width` tiles wide. */
function tunnel(grid: Canvas, rng: Rng, a: Vec, b: Vec, width: number): void {
  let x = a.x;
  let y = a.y;
  let guard = 0;
  while ((Math.abs(x - b.x) > 1 || Math.abs(y - b.y) > 1) && guard < 2000) {
    guard += 1;
    for (let oy = 0; oy < width; oy += 1) {
      for (let ox = 0; ox < width; ox += 1) setTile(grid, Math.round(x) + ox, Math.round(y) + oy, FLOOR);
    }
    const dx = b.x - x;
    const dy = b.y - y;
    if (random(rng) < 0.22) {
      if (Math.abs(dx) > Math.abs(dy)) y += random(rng) < 0.5 ? 1 : -1;
      else x += random(rng) < 0.5 ? 1 : -1;
      y = Math.max(2, Math.min(grid.height - 3, y));
      x = Math.max(2, Math.min(grid.width - 3, x));
    } else if (Math.abs(dx) > Math.abs(dy)) x += Math.sign(dx);
    else y += Math.sign(dy);
  }
}

function cirithUngol(tuning: StageTuning, rng: Rng): Layout {
  const { width, height } = tuning;
  const grid = blank(width, height, ROCK);
  const columns = 5;
  const halls: Array<[Vec, Vec]> = [];
  for (let i = 0; i < columns; i += 1) {
    const x = Math.round(9 + ((width - 18) * i) / (columns - 1)) + randomInt(rng, -2, 2);
    const upper = { x, y: randomInt(rng, 6, Math.floor(height / 2) - 4) };
    const lower = { x: x + randomInt(rng, -3, 3), y: randomInt(rng, Math.ceil(height / 2) + 4, height - 7) };
    halls.push([upper, lower]);
    blob(grid, rng, upper.x, upper.y, randomRange(rng, 2.6, 3.8), randomRange(rng, 2, 2.8), FLOOR);
    blob(grid, rng, lower.x, lower.y, randomRange(rng, 2.6, 3.8), randomRange(rng, 2, 2.8), FLOOR);
  }
  const start = { x: 3, y: randomInt(rng, 10, height - 11) };
  const exit = { x: width - 4, y: randomInt(rng, 10, height - 11) };
  // A ladder of tunnels: every rung is a choice, and there is always another way round a spider.
  for (let i = 0; i < columns; i += 1) {
    const [upper, lower] = halls[i]!;
    tunnel(grid, rng, upper, lower, 2);
    const next = halls[i + 1];
    if (!next) continue;
    tunnel(grid, rng, upper, next[0], 2);
    tunnel(grid, rng, lower, next[1], 2);
  }
  tunnel(grid, rng, start, halls[0]![random(rng) < 0.5 ? 0 : 1], 2);
  tunnel(grid, rng, halls[columns - 1]![random(rng) < 0.5 ? 0 : 1], exit, 2);
  blob(grid, rng, start.x + 1, start.y, 2.4, 2.4, FLOOR);
  blob(grid, rng, exit.x - 1, exit.y, 2.4, 2.4, FLOOR);

  const webs = 14;
  for (let i = 0; i < webs; i += 1) {
    const x = randomInt(rng, 12, width - 8);
    const y = randomInt(rng, 3, height - 4);
    if (getTile(grid, x, y) === FLOOR) blob(grid, rng, x, y, 1.3, 1.3, WEB, FLOOR);
  }

  // A spider keeps to one hall of a column, so the other rung is the way past it, if you know.
  const routes: RoutePlan[] = [
    { kind: "orc", points: [halls[1]![1], halls[2]![1], halls[3]![1], halls[4]![1]], count: 1 },
    { kind: "orc", points: [halls[4]![0], halls[3]![0], halls[2]![0]], count: 1 },
  ];
  for (const column of [1, 3]) {
    const hall = halls[column]![randomInt(rng, 0, 1)]!;
    const ring = [[-2, -1], [2, -1], [2, 1], [-2, 1]] as const;
    routes.push({ kind: "spider", points: ring.map(([dx, dy]) => ({ x: hall.x + dx, y: hall.y + dy })), count: 1 });
  }
  return { grid, start, exit, routes, water: 3 };
}

function morgai(tuning: StageTuning, rng: Rng): Layout {
  const { width, height } = tuning;
  const grid = blank(width, height, FLOOR);
  const ridges: number[] = [];
  for (let baseY = 6; baseY < height - 4; baseY += 7) {
    ridges.push(baseY);
    const phase = randomRange(rng, 0, 6.28);
    let nextGap = randomInt(rng, 5, 14);
    let gapLeft = 0;
    for (let x = 2; x < width - 2; x += 1) {
      if (x >= nextGap) {
        gapLeft = randomInt(rng, 3, 5);
        nextGap = x + gapLeft + randomInt(rng, 9, 16);
      }
      if (gapLeft > 0) {
        gapLeft -= 1;
        continue;
      }
      const y = Math.round(baseY + Math.sin(x / 7 + phase) * 1.6);
      setTile(grid, x, y, ROCK);
      if (Math.sin(x / 3 + phase * 2) > -0.2) setTile(grid, x, y + 1, ROCK);
    }
  }
  for (let i = 0; i < 16; i += 1) {
    blob(grid, rng, randomInt(rng, 8, width - 8), randomInt(rng, 3, height - 4), randomRange(rng, 1.5, 3.2), randomRange(rng, 1, 2), THORN, FLOOR);
  }
  for (let i = 0; i < 12; i += 1) {
    const x = randomInt(rng, 6, width - 6);
    const y = randomInt(rng, 3, height - 4);
    setTile(grid, x, y, ROCK);
    setTile(grid, x + 1, y, ROCK);
  }
  const start = { x: 3, y: randomInt(rng, 8, height - 9) };
  const exit = { x: width - 4, y: randomInt(rng, 8, height - 9) };
  blob(grid, rng, start.x, start.y, 2.6, 2.6, FLOOR);
  blob(grid, rng, exit.x, exit.y, 2.6, 2.6, FLOOR);

  const routes: RoutePlan[] = [];
  const lanes = ridges.length;
  for (let i = 0; i < 6; i += 1) {
    const lane = ridges[i % lanes]! + 3;
    const from = randomInt(rng, 14 + i * 5, 26 + i * 5);
    const to = from + randomInt(rng, 16, 26);
    routes.push({ kind: "orc", points: [{ x: from, y: lane }, { x: Math.min(to, width - 6), y: lane + randomInt(rng, -2, 7) }], count: 1 });
  }
  return { grid, start, exit, routes, water: 3 };
}

function gorgoroth(tuning: StageTuning, rng: Rng): Layout {
  const { width, height } = tuning;
  const grid = blank(width, height, FLOOR);
  for (let i = 0; i < 16; i += 1) {
    blob(grid, rng, randomInt(rng, 10, width - 10), randomInt(rng, 4, height - 5), randomRange(rng, 2.5, 6), randomRange(rng, 2, 4), PIT);
  }
  // Rock falls in a jittered grid: the player can always see the next shelter, and it is always far.
  const cellX = 13;
  const cellY = 9;
  for (let gx = cellX; gx < width - 6; gx += cellX) {
    for (let gy = 5; gy < height - 3; gy += cellY) {
      if (random(rng) > 0.56) continue;
      blob(grid, rng, gx + randomInt(rng, -4, 4), gy + randomInt(rng, -2, 2), randomRange(rng, 1.4, 3), randomRange(rng, 0.9, 1.6), ROCK);
    }
  }
  const start = { x: 3, y: randomInt(rng, 8, height - 9) };
  const exit = { x: width - 4, y: randomInt(rng, 8, height - 9) };
  blob(grid, rng, start.x, start.y, 2.6, 2.6, FLOOR);
  blob(grid, rng, exit.x, exit.y, 2.6, 2.6, FLOOR);

  const column = (x: number, spread: number): Vec[] => [
    { x: x - spread, y: 4 },
    { x: x + spread, y: 4 },
    { x: x + spread, y: height - 5 },
    { x: x - spread, y: height - 5 },
  ];
  const routes: RoutePlan[] = [
    { kind: "orc", points: column(Math.floor(width * 0.34), 5), count: 4 },
    { kind: "orc", points: column(Math.floor(width * 0.68), 6), count: 5 },
    { kind: "orc", points: [{ x: 24, y: 12 }, { x: 46, y: 18 }], count: 1 },
    { kind: "orc", points: [{ x: 44, y: height - 10 }, { x: 62, y: height - 16 }], count: 1 },
    { kind: "orc", points: [{ x: width - 22, y: 10 }, { x: width - 12, y: height - 12 }], count: 1 },
    { kind: "orc", points: [{ x: 14, y: height - 8 }, { x: 30, y: 8 }], count: 2 },
  ];
  return { grid, start, exit, routes, water: 4 };
}

function orodruin(tuning: StageTuning, rng: Rng): Layout {
  const { width, height } = tuning;
  const grid = blank(width, height, FLOOR);
  grid.tiles.fill(LAVA);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) setTile(grid, x, y, FLOOR);
  }
  const start = { x: Math.floor(width / 2), y: height - 4 };
  const exit = { x: Math.floor(width / 2) + randomInt(rng, -8, 8), y: 3 };
  let left = random(rng) < 0.5;
  const rocks: Vec[] = [];
  for (let baseY = height - 11; baseY > 8; baseY -= 11) {
    const phase = randomRange(rng, 0, 6.28);
    const gapWidth = randomInt(rng, 6, 8);
    const gapFrom = left ? randomInt(rng, 3, 7) : width - 3 - gapWidth - randomInt(rng, 0, 4);
    for (let x = 1; x < width - 1; x += 1) {
      if (x >= gapFrom && x < gapFrom + gapWidth) continue;
      const y = Math.round(baseY + Math.sin(x / 5 + phase) * 1.4);
      setTile(grid, x, y, LAVA);
      setTile(grid, x, y + 1, LAVA);
    }
    rocks.push({ x: gapFrom + randomInt(rng, 1, gapWidth - 2), y: baseY + 5 });
    rocks.push({ x: randomInt(rng, 8, width - 9), y: baseY - 4 });
    left = !left;
  }
  // "No cover" is the point of this stage: a few lumps of slag, each good for one sweep.
  for (const rock of rocks) {
    setTile(grid, rock.x, rock.y, ROCK);
    if (random(rng) < 0.6) setTile(grid, rock.x + 1, rock.y, ROCK);
  }
  blob(grid, rng, start.x, start.y, 2.6, 2.2, FLOOR);
  blob(grid, rng, exit.x, exit.y, 2.2, 2, FLOOR);
  const routes: RoutePlan[] = [
    { kind: "orc", points: [{ x: 8, y: height - 18 }, { x: width - 9, y: height - 16 }], count: 1 },
    { kind: "orc", points: [{ x: 8, y: Math.floor(height / 2) + 3 }, { x: width - 9, y: Math.floor(height / 2) + 5 }], count: 1 },
  ];
  return { grid, start, exit, routes, water: 3 };
}

const BUILDERS: Record<StageKey, (tuning: StageTuning, rng: Rng) => Layout> = {
  "cirith-ungol": cirithUngol,
  morgai,
  gorgoroth,
  orodruin,
};

function nearestPassable(grid: Canvas, point: Vec): Vec | null {
  for (let radius = 0; radius < 9; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = Math.floor(point.x) + dx;
        const y = Math.floor(point.y) + dy;
        if (isPassable(grid, x, y)) return { x, y };
      }
    }
  }
  return null;
}

/** Walks the plan's points into one closed loop of tile centres. Empty if it cannot be walked. */
function buildRoute(grid: Canvas, points: Vec[]): Vec[] {
  const nodes = points.map((point) => nearestPassable(grid, point));
  const loop: Vec[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    if (!from || !to) return [];
    const leg = findPath(grid, from, to);
    if (leg.length === 0 && (from.x !== to.x || from.y !== to.y)) return [];
    loop.push(...leg);
  }
  return loop;
}

/** Water lies a little off the road, spaced along it: scarce, and worth a detour. */
function placeWater(grid: Canvas, rng: Rng, start: Vec, exit: Vec, count: number): Pickup[] {
  const fromStart = distanceField(grid, start);
  const fromExit = distanceField(grid, exit);
  const direct = fromStart[Math.floor(exit.y) * grid.width + Math.floor(exit.x)]!;
  const pickups: Pickup[] = [];
  for (let n = 0; n < count; n += 1) {
    const low = (direct * (n + 0.5)) / (count + 0.5);
    const high = (direct * (n + 1)) / (count + 0.5);
    const options: number[] = [];
    for (let i = 0; i < grid.tiles.length; i += 1) {
      const a = fromStart[i]!;
      const b = fromExit[i]!;
      if (a < 0 || b < 0 || a < low || a > high) continue;
      const detour = a + b - direct;
      if (detour >= 3 && detour <= 24 && grid.tiles[i] === FLOOR) options.push(i);
    }
    if (options.length === 0) continue;
    const index = options[randomInt(rng, 0, options.length - 1)]!;
    pickups.push({ x: (index % grid.width) + 0.5, y: Math.floor(index / grid.width) + 0.5, taken: false });
  }
  return pickups;
}

function eyeFraming(tuning: StageTuning): Pick<StageMap, "origin" | "sweepMin" | "sweepMax" | "beamHalf" | "sweepSpeed" | "shadowLength"> {
  const { width, height } = tuning;
  const distance = Math.max(height * 0.75, 30);
  const origin = { x: width * tuning.originX, y: -distance };
  const corners = [[0, 0], [width, 0], [0, height], [width, height]] as const;
  const angles = corners.map(([x, y]) => Math.atan2(y - origin.y, x - origin.x));
  const beamHalf = Math.atan(tuning.beamTiles / 2 / (distance + height / 2));
  const sweepMin = Math.min(...angles) + beamHalf * 0.3;
  const sweepMax = Math.max(...angles) - beamHalf * 0.3;
  return { origin, sweepMin, sweepMax, beamHalf, sweepSpeed: (sweepMax - sweepMin) / tuning.sweepSeconds, shadowLength: tuning.shadowLength };
}

function tileCentre(point: Vec): Vec {
  return { x: Math.floor(point.x) + 0.5, y: Math.floor(point.y) + 0.5 };
}

export function generateStage(worldSeed: number, stageIndex: number): GeneratedStage {
  const id = STAGE_IDS[stageIndex]!;
  const tuning = STAGE_TUNING[id];
  for (let attempt = 0; ; attempt += 1) {
    const rng = createRng(mixSeed(mixSeed(worldSeed, stageIndex), attempt));
    const { grid, start, exit, routes, water } = BUILDERS[id](tuning, rng);
    const field = distanceField(grid, start);
    const steps = field[Math.floor(exit.y) * grid.width + Math.floor(exit.x)]!;
    if (steps < 0) {
      if (attempt > 40) throw new Error(`no route on ${id} for seed ${worldSeed}`);
      continue;
    }
    const pickups = placeWater(grid, rng, start, exit, water);
    const patrols: Patrol[] = [];
    for (const plan of routes) {
      const route = buildRoute(grid, plan.points);
      if (route.length < 4) continue;
      const startAt = randomInt(rng, 0, route.length - 1);
      for (let i = 0; i < plan.count; i += 1) {
        const routeIndex = (startAt + route.length - (i * 3) % route.length) % route.length;
        const at = route[routeIndex]!;
        if (Math.hypot(at.x - start.x, at.y - start.y) < 12) continue;
        patrols.push({
          id: patrols.length, kind: plan.kind, x: at.x, y: at.y, facing: 0, state: "patrol", alert: 0,
          route, routeIndex, path: [], target: null, timer: 0, patience: 0, repath: 0,
        });
      }
    }
    return {
      map: {
        id, width: grid.width, height: grid.height, tiles: grid.tiles,
        start: tileCentre(start), exit: tileCentre(exit), ...eyeFraming(tuning),
      },
      patrols,
      pickups,
    };
  }
}

