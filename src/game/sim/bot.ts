// Headless players, for tuning and for the proof that the game can be finished and is not trivial.
// Test tooling: nothing in the shipped route imports this file.
import { canPatrolSee, collides, gazeOf, inShadow, step } from "./index";
import { angleDelta, bearingFromEye, distanceField, hasLineOfSight, isSolid } from "./grid";
import { IDLE_INPUT, PIT, THORN, WEB } from "./types";
import type { StageMap, StepInput, Vec, World } from "./types";
import { VISION_HALF, VISION_RANGE, WALK_SPEED } from "./tuning";

export type Bot = (world: World) => StepInput;

interface Plan {
  map: StageMap;
  /** Weighted cost to the exit per tile. */
  toExit: Float64Array;
  shadow: Uint8Array;
  water: Map<string, Int32Array>;
}

/** Binary-heap Dijkstra outwards from `target`; `extra` adds a price per tile. */
function weightedField(map: StageMap, target: Vec, shadow: Uint8Array, extra?: Float64Array): Float64Array {
  const { width, height, tiles } = map;
  const cost = new Float64Array(width * height).fill(Infinity);
  const start = Math.floor(target.y) * width + Math.floor(target.x);
  cost[start] = 0;
  const heap: Array<[number, number]> = [[0, start]];
  const push = (item: [number, number]): void => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent]![0] <= heap[i]![0]) break;
      [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
      i = parent;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0]!;
    const tail = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = tail;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let least = i;
        if (l < heap.length && heap[l]![0] < heap[least]![0]) least = l;
        if (r < heap.length && heap[r]![0] < heap[least]![0]) least = r;
        if (least === i) break;
        [heap[least], heap[i]] = [heap[i]!, heap[least]!];
        i = least;
      }
    }
    return top;
  };
  while (heap.length > 0) {
    const [done, index] = pop();
    if (done > cost[index]!) continue;
    const x = index % width;
    const y = (index - x) / width;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      const tile = tiles[next]!;
      if (isSolid(tile)) continue;
      let weight = shadow[next] ? 1 : 1.25;
      if (tile === PIT) weight += 1.2;
      if (tile === WEB) weight += 3;
      if (tile === THORN) weight += 0.2;
      if (extra) weight += extra[next]!;
      const total = done + weight;
      if (total < cost[next]!) {
        cost[next] = total;
        push([total, next]);
      }
    }
  }
  return cost;
}

function planFor(map: StageMap): Plan {
  const shadow = new Uint8Array(map.width * map.height);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) shadow[y * map.width + x] = inShadow(map, x + 0.5, y + 0.5) ? 1 : 0;
  }
  return { map, toExit: weightedField(map, map.exit, shadow), shadow, water: new Map() };
}

/** Where the sweep will point `seconds` from now, folding at the ends of its arc. */
function angleAhead(world: World, seconds: number): number {
  const { eye, map } = world;
  if (eye.mode !== "sweep") return eye.angle;
  let angle = eye.angle + eye.dir * map.sweepSpeed * seconds;
  if (angle > map.sweepMax) angle = 2 * map.sweepMax - angle;
  if (angle < map.sweepMin) angle = 2 * map.sweepMin - angle;
  return angle;
}

function sampled(field: ArrayLike<number>, map: StageMap, x: number, y: number): number {
  const value = field[Math.floor(y) * map.width + Math.floor(x)]!;
  return value < 0 ? Infinity : value;
}

/** The only strategy: walk the shortest road and never touch the Ring. */
export function createRushBot(): Bot {
  let plan: Plan | null = null;
  let steps: Int32Array | null = null;
  return (world) => {
    if (world.phase === "briefing") return { ...IDLE_INPUT, confirm: true };
    if (plan?.map !== world.map) {
      plan = planFor(world.map);
      steps = distanceField(world.map, world.map.exit);
    }
    const { player, map } = world;
    let best: Vec = { x: 0, y: 0 };
    let bestScore = Infinity;
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const nx = player.x + dx;
      const ny = player.y + dy;
      if (collides(map, nx, ny) || collides(map, player.x + dx * 0.2, player.y + dy * 0.2)) continue;
      const score = sampled(steps!, map, nx, ny) + Math.hypot(map.exit.x - nx, map.exit.y - ny) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        best = { x: dx, y: dy };
      }
    }
    return { moveX: best.x, moveY: best.y, sneak: false, ring: false, confirm: false };
  };
}

export interface CarefulOptions {
  /** Most uses of the Ring it allows itself. */
  ringBudget: number;
  /** Decision interval in ticks: a human reacts in 200-300 ms, not 16. */
  reaction: number;
}

/** Plays the way the instructions suggest: shelter from the sweep, skirt the cones, spend the Ring. */
export function createCarefulBot(options: Partial<CarefulOptions> = {}): Bot {
  const { ringBudget, reaction } = { ringBudget: 9, reaction: 15, ...options };
  let plan: Plan | null = null;
  let last: StepInput = IDLE_INPUT;
  let wearing = 0;
  let cachedRoad: Float64Array | null = null;
  let cachedAt = 0;
  let cachedFor: Vec | null = null;

  function waterField(world: World): { pickup: Vec; distance: number } | null {
    const { player, map, pickups } = world;
    let chosen: { pickup: Vec; distance: number } | null = null;
    for (const pickup of pickups) {
      if (pickup.taken) continue;
      const key = `${pickup.x},${pickup.y}`;
      let field = plan!.water.get(key);
      if (!field) {
        field = distanceField(map, pickup);
        plan!.water.set(key, field);
      }
      const distance = sampled(field, map, player.x, player.y);
      if (!chosen || distance < chosen.distance) chosen = { pickup, distance };
    }
    return chosen;
  }

  /** Prices every tile a patrol can see or would reach, so the road bends around it. */
  function patrolPrice(world: World): Float64Array {
    const { map, patrols, tick, player } = world;
    const price = new Float64Array(map.width * map.height);
    for (const patrol of patrols) {
      const reach = patrol.kind === "spider" ? 5 : VISION_RANGE + 1;
      const fromX = Math.max(0, Math.floor(patrol.x - reach));
      const toX = Math.min(map.width - 1, Math.ceil(patrol.x + reach));
      const fromY = Math.max(0, Math.floor(patrol.y - reach));
      const toY = Math.min(map.height - 1, Math.ceil(patrol.y + reach));
      const gaze = gazeOf(patrol, tick);
      for (let y = fromY; y <= toY; y += 1) {
        for (let x = fromX; x <= toX; x += 1) {
          const dx = x + 0.5 - patrol.x;
          const dy = y + 0.5 - patrol.y;
          const distance = Math.hypot(dx, dy);
          if (distance > reach) continue;
          const cone = patrol.kind === "orc" && !player.ringOn && Math.abs(angleDelta(gaze, Math.atan2(dy, dx))) < VISION_HALF + 0.25;
          if ((cone || distance < 3.2) && hasLineOfSight(map, patrol, { x: x + 0.5, y: y + 0.5 })) {
            price[y * map.width + x]! += 30;
          }
        }
      }
    }
    return price;
  }

  function dangerAt(world: World, x: number, y: number): number {
    const { map, patrols, exposure } = world;
    let danger = 0;
    const shadowed = plan!.shadow[Math.floor(y) * map.width + Math.floor(x)] === 1;
    if (!shadowed) {
      const bearing = bearingFromEye(map, x, y);
      const worried = exposure > 0.35 ? 3 : 1;
      for (const seconds of [0.4, 1, 1.8]) {
        const off = Math.abs(angleDelta(angleAhead(world, seconds), bearing));
        if (off < map.beamHalf * 1.25) danger += 14 * worried;
      }
    }
    for (const patrol of patrols) {
      const dx = x - patrol.x;
      const dy = y - patrol.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 12) continue;
      if (patrol.state === "chase") {
        danger += (12 - distance) * 7;
        continue;
      }
      if (distance < 3.2) danger += (3.2 - distance) * 40;
    }
    return danger;
  }

  function decide(world: World): StepInput {
    const { player, map, patrols, eye, water, burden, ringUses, exposure } = world;
    const lead = WALK_SPEED * 0.35;
    const goal = water < 0.8 ? waterField(world) : null;
    const useWater = goal !== null && goal.distance < (water < 0.35 ? 40 : 16);
    const target = useWater ? goal!.pickup : map.exit;
    if (!cachedRoad || world.tick >= cachedAt + 30 || cachedFor !== target) {
      cachedRoad = weightedField(map, target, plan!.shadow, patrolPrice(world));
      cachedAt = world.tick;
      cachedFor = target;
    }
    const road = cachedRoad;
    const cost = (x: number, y: number): number => sampled(road, map, x, y);

    let bestX = 0;
    let bestY = 0;
    let bestScore = cost(player.x, player.y) + dangerAt(world, player.x, player.y) + 0.8;
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const nx = player.x + dx * lead;
      const ny = player.y + dy * lead;
      if (collides(map, nx, ny) || collides(map, player.x + dx * 0.15, player.y + dy * 0.15) || collides(map, player.x + dx * 0.8, player.y + dy * 0.8)) continue;
      const score = cost(nx, ny) + dangerAt(world, nx, ny);
      if (score < bestScore) {
        bestScore = score;
        bestX = dx;
        bestY = dy;
      }
    }

    let hunted = false;
    let near = false;
    for (const patrol of patrols) {
      const distance = Math.hypot(patrol.x - player.x, patrol.y - player.y);
      if (distance < 7) near = true;
      if (patrol.kind !== "orc") continue;
      if ((patrol.state === "chase" && distance < 6) || (canPatrolSee(world, patrol) && patrol.alert > 0.6 && distance < 5)) hunted = true;
    }
    wearing = player.ringOn ? wearing + reaction : 0;
    let ring = player.ringOn;
    const affordable = burden < 0.86 && ringUses < ringBudget;
    if (!player.ringOn && hunted && affordable && exposure < 0.5) ring = true;
    if (player.ringOn && (wearing > 150 || exposure > 0.45 || (!hunted && wearing > 60))) ring = false;

    const spiderNear = patrols.some((p) => p.kind === "spider" && p.state !== "chase" && Math.hypot(p.x - player.x, p.y - player.y) < 7);
    const fleeing = patrols.some((p) => p.state === "chase" && Math.hypot(p.x - player.x, p.y - player.y) < 10);
    const sneak = (near || spiderNear) && !hunted && !fleeing && eye.mode === "sweep" && !player.inBeam;
    return { moveX: bestX, moveY: bestY, sneak, ring, confirm: false };
  }

  return (world) => {
    if (world.phase === "briefing") return { ...IDLE_INPUT, ring: false, confirm: true };
    if (plan?.map !== world.map) {
      plan = planFor(world.map);
      cachedRoad = null;
    }
    if (world.tick % reaction === 0) last = decide(world);
    return last;
  };
}

export interface BotResult {
  won: boolean;
  stage: number;
  cause: World["cause"];
  seconds: number;
  burden: number;
  water: number;
  ringUses: number;
  /** Seconds spent in each stage reached. */
  stageSeconds: number[];
}

export function playOut(world: World, bot: Bot, maxSeconds = 1500): BotResult {
  let current = world;
  const stageSeconds: number[] = [];
  const limit = maxSeconds * 60;
  let guard = 0;
  while (current.phase !== "won" && current.phase !== "lost" && guard < limit) {
    guard += 1;
    const before = current.stageIndex;
    const ticks = current.stats.ticks;
    current = step(current, bot(current));
    stageSeconds[before] = (stageSeconds[before] ?? 0) + (current.stats.ticks - ticks) / 60;
  }
  return {
    won: current.phase === "won", stage: current.stageIndex, cause: current.cause, seconds: current.stats.ticks / 60,
    burden: current.burden, water: current.water, ringUses: current.ringUses, stageSeconds,
  };
}

