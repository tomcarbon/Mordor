// The Last Road: the pure simulation. No DOM, clock or Math.random; see docs/adr/0001.
import { angleDelta, bearingFromEye, findPath, hasLineOfSight, inShadow, isPassable, isSolid, tileAt } from "./grid";
import { generateStage } from "./mapgen";
import { createRng, mixSeed, random } from "./rng";
import type { Rng } from "./rng";
import * as T from "./tuning";
import { PIT, STAGE_IDS, THORN, WEB } from "./types";
import type { Eye, GameEvent, LossCause, Patrol, Player, StageMap, StepInput, Vec, World } from "./types";

export { SIM_DT } from "./tuning";
export * from "./types";
export { inShadow, bearingFromEye } from "./grid";

function newPlayer(map: StageMap, ringOn: boolean): Player {
  return {
    x: map.start.x, y: map.start.y, facing: 0, moving: false, sneaking: false, ringOn,
    inBeam: false, inShadow: false, noise: 0,
  };
}

function newEye(map: StageMap, rng: Rng): Eye {
  const left = random(rng) < 0.5;
  return { angle: left ? map.sweepMin : map.sweepMax, dir: left ? 1 : -1, mode: "sweep", linger: 0, locked: false };
}

export function createWorld(seed: number): World {
  const rng = createRng(mixSeed(seed, 9001));
  const { map, patrols, pickups } = generateStage(seed, 0);
  return {
    seed, rng: rng.state, tick: 0, phase: "briefing", stageIndex: 0, map,
    player: newPlayer(map, false), eye: newEye(map, rng), patrols, pickups,
    exposure: 0, burden: 0, ringUses: 0, water: 1, cause: null,
    stats: { ticks: 0, spotted: 0, pickups: 0 }, events: [],
  };
}

/** The direction a patrol is actually looking: it scans either side of where it walks. */
export function gazeOf(patrol: Patrol, tick: number): number {
  const scan = patrol.state === "chase" ? 0 : 0.38 * Math.sin(tick / 45 + patrol.id * 1.7);
  return patrol.facing + scan;
}

export function visionRange(world: World): number {
  const { player, map } = world;
  const tile = tileAt(map, player.x, player.y);
  let range = T.VISION_RANGE;
  if (player.sneaking) range *= T.SNEAK_VISION;
  if (player.inShadow) range *= T.SHADOW_VISION;
  if (tile === THORN) range *= T.THORN_VISION;
  if (tile === PIT) range *= T.PIT_VISION;
  return range;
}

export function canPatrolSee(world: World, patrol: Patrol): boolean {
  const { player, map, tick } = world;
  if (patrol.kind === "spider" || player.ringOn) return false;
  const dx = player.x - patrol.x;
  const dy = player.y - patrol.y;
  const distance = Math.hypot(dx, dy);
  if (distance > visionRange(world)) return false;
  if (distance > T.TOUCH_SENSE && Math.abs(angleDelta(gazeOf(patrol, tick), Math.atan2(dy, dx))) > T.VISION_HALF) return false;
  return hasLineOfSight(map, patrol, player);
}

export function collides(map: StageMap, x: number, y: number): boolean {
  const r = T.PLAYER_RADIUS;
  return (
    isSolid(tileAt(map, x - r, y - r)) || isSolid(tileAt(map, x + r, y - r)) ||
    isSolid(tileAt(map, x - r, y + r)) || isSolid(tileAt(map, x + r, y + r))
  );
}

function updateRing(world: World, wanted: boolean, events: GameEvent[]): void {
  const { player, map } = world;
  if (wanted !== player.ringOn) {
    player.ringOn = wanted;
    events.push(wanted ? "ring-on" : "ring-off");
    if (wanted) {
      world.ringUses += 1;
      world.burden += T.RING_TAP;
    }
  }
  const tuning = T.STAGE_TUNING[map.id];
  if (player.ringOn) {
    const rate = T.RING_RATE * (1 + T.RING_GROWTH * (world.ringUses - 1)) * tuning.ringBurden;
    world.burden += rate * T.SIM_DT;
  }
  world.burden += tuning.burdenDrift * T.SIM_DT;
}

function updatePlayer(world: World, input: StepInput, events: GameEvent[]): void {
  const { player, map } = world;
  const tile = tileAt(map, player.x, player.y);
  const length = Math.hypot(input.moveX, input.moveY);
  const push = Math.min(1, length);
  player.moving = push > 0.01;
  player.sneaking = input.sneak;
  player.noise = 0;
  if (player.moving) {
    let speed = (input.sneak ? T.SNEAK_SPEED : T.WALK_SPEED) * push;
    if (tile === PIT) speed *= T.PIT_SPEED;
    else if (tile === WEB) speed *= T.WEB_SPEED;
    else if (tile === THORN) speed *= T.THORN_SPEED;
    speed *= 1 - T.BURDEN_DRAG * world.burden;
    if (world.water <= 0) speed *= T.DRY_SPEED;
    const vx = (input.moveX / length) * speed * T.SIM_DT;
    const vy = (input.moveY / length) * speed * T.SIM_DT;
    if (!collides(map, player.x + vx, player.y)) player.x += vx;
    if (!collides(map, player.x, player.y + vy)) player.y += vy;
    player.facing = Math.atan2(vy, vx);
    player.noise = input.sneak ? T.SNEAK_NOISE : T.WALK_NOISE;
    if (tileAt(map, player.x, player.y) === WEB && tile !== WEB) events.push("web");
  }

  const hadWater = world.water > 0;
  const thirst = T.STAGE_TUNING[map.id].waterDrain * (tile === PIT ? T.PIT_THIRST : 1);
  world.water = Math.max(0, world.water - thirst * T.SIM_DT);
  if (hadWater && world.water <= 0) events.push("dry");
  if (world.water <= 0) world.burden += T.DRY_BURDEN * T.SIM_DT;

  for (const pickup of world.pickups) {
    if (!pickup.taken && Math.hypot(pickup.x - player.x, pickup.y - player.y) < 0.8) {
      pickup.taken = true;
      world.water = Math.min(1, world.water + T.WATER_PICKUP);
      world.stats.pickups += 1;
      events.push("pickup");
    }
  }
}

function updateEye(world: World, events: GameEvent[]): void {
  const { eye, map, player } = world;
  const bearing = bearingFromEye(map, player.x, player.y);
  player.inShadow = inShadow(map, player.x, player.y);

  if (player.ringOn) {
    eye.mode = "hunt";
    const delta = angleDelta(eye.angle, bearing);
    const reach = map.sweepSpeed * T.EYE_HUNT * T.SIM_DT;
    eye.angle += Math.abs(delta) <= reach ? delta : Math.sign(delta) * reach;
    eye.linger = T.EYE_LINGER;
  } else if (eye.mode === "hunt") {
    eye.mode = "linger";
  } else if (eye.mode === "linger") {
    eye.linger -= T.SIM_DT;
    if (eye.linger <= 0) eye.mode = "sweep";
  } else {
    const snagged = player.inBeam && !player.inShadow;
    eye.angle += eye.dir * map.sweepSpeed * (snagged ? T.EYE_SNAG : 1) * T.SIM_DT;
    if (eye.angle >= map.sweepMax) eye.dir = -1;
    else if (eye.angle <= map.sweepMin) eye.dir = 1;
  }

  player.inBeam = Math.abs(angleDelta(eye.angle, bearing)) <= map.beamHalf;
  const lockedNow = player.ringOn && player.inBeam;
  if (lockedNow && !eye.locked) events.push("eye-locked");
  eye.locked = lockedNow;

  const rate = 1 / T.STAGE_TUNING[map.id].eyeSeconds;
  const before = world.exposure;
  if (player.inBeam && !player.inShadow) {
    world.exposure += rate * (player.ringOn ? T.RING_EXPOSURE : 1) * T.SIM_DT;
  } else if (player.inBeam && player.ringOn) {
    world.exposure += rate * T.RING_SHADOW_EXPOSURE * T.SIM_DT;
  } else {
    world.exposure = Math.max(0, world.exposure - T.EXPOSURE_DECAY * T.SIM_DT);
  }
  world.exposure = Math.min(1, world.exposure);
  if (before < T.EYE_CALL && world.exposure >= T.EYE_CALL) {
    events.push("eye-called");
    for (const patrol of world.patrols) {
      if (patrol.kind === "orc" && patrol.state !== "chase" && Math.hypot(patrol.x - player.x, patrol.y - player.y) < T.EYE_CALL_RANGE) {
        suspect(world, patrol, player);
      }
    }
  }
}

function suspect(world: World, patrol: Patrol, at: Vec): void {
  patrol.state = "suspicious";
  patrol.target = { x: at.x, y: at.y };
  patrol.path = findPath(world.map, patrol, at);
  patrol.timer = T.SEARCH_SECONDS;
}

function raiseChase(world: World, patrol: Patrol, events: GameEvent[]): void {
  patrol.state = "chase";
  patrol.alert = 1;
  patrol.timer = T.LOSE_SIGHT_SECONDS;
  patrol.patience = T.SPIDER_PATIENCE;
  patrol.repath = 0;
  world.stats.spotted += 1;
  events.push("spotted");
  for (const other of world.patrols) {
    if (other === patrol || other.kind !== "orc" || other.state === "chase") continue;
    if (Math.hypot(other.x - patrol.x, other.y - patrol.y) < T.ALARM_SPREAD) suspect(world, other, world.player);
  }
}

function walkTowards(patrol: Patrol, goal: Vec, speed: number): boolean {
  const dx = goal.x - patrol.x;
  const dy = goal.y - patrol.y;
  const distance = Math.hypot(dx, dy);
  const reach = speed * T.SIM_DT;
  if (distance > 0.001) {
    const delta = angleDelta(patrol.facing, Math.atan2(dy, dx));
    const turn = T.TURN_RATE * T.SIM_DT;
    patrol.facing += Math.abs(delta) <= turn ? delta : Math.sign(delta) * turn;
  }
  if (distance <= reach) {
    patrol.x = goal.x;
    patrol.y = goal.y;
    return true;
  }
  patrol.x += (dx / distance) * reach;
  patrol.y += (dy / distance) * reach;
  return false;
}

function followPath(patrol: Patrol, speed: number): boolean {
  const next = patrol.path[0];
  if (!next) return true;
  if (walkTowards(patrol, next, speed)) patrol.path.shift();
  return patrol.path.length === 0;
}

function returnToBeat(world: World, patrol: Patrol): void {
  // Back to the closest point on its beat.
  let best = patrol.routeIndex;
  let bestDistance = Infinity;
  for (let i = 0; i < patrol.route.length; i += 1) {
    const point = patrol.route[i]!;
    const distance = Math.hypot(point.x - patrol.x, point.y - patrol.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  patrol.routeIndex = best;
  patrol.path = findPath(world.map, patrol, patrol.route[best]!);
  patrol.state = "return";
  patrol.target = null;
}

function updatePatrol(world: World, patrol: Patrol, events: GameEvent[]): void {
  const { player, map } = world;
  const distance = Math.hypot(player.x - patrol.x, player.y - patrol.y);
  const sees = canPatrolSee(world, patrol);
  const hearing = player.noise * (patrol.kind === "spider" ? T.SPIDER_HEARING : 1);
  const webbed = patrol.kind === "spider" && events.includes("web") && distance < T.WEB_ALARM_RANGE;
  // Rock deadens a footfall: beyond a few tiles a sound needs an open line to carry.
  const carries = distance < T.HEARING_THROUGH_ROCK || hasLineOfSight(map, patrol, player);
  const hears = (distance < hearing && carries) || webbed;

  if (sees) {
    const closeness = 1 - (0.75 * distance) / T.VISION_RANGE;
    patrol.alert = Math.min(1, patrol.alert + T.ALERT_RATE * closeness * T.SIM_DT);
    patrol.timer = patrol.state === "chase" ? T.LOSE_SIGHT_SECONDS : patrol.timer;
  } else {
    const decay = player.ringOn ? T.ALERT_DECAY * 3 : T.ALERT_DECAY;
    if (patrol.state !== "chase") patrol.alert = Math.max(0, patrol.alert - decay * T.SIM_DT);
  }

  if (patrol.state !== "chase") {
    const spiderStirs = patrol.state === "patrol" && hears;
    if (patrol.kind === "spider" ? spiderStirs : patrol.alert >= 1) {
      raiseChase(world, patrol, events);
      patrol.target = { x: player.x, y: player.y };
    } else if (patrol.kind === "orc" && patrol.state !== "suspicious" && (hears || patrol.alert >= T.SUSPICION_ALERT)) {
      suspect(world, patrol, player);
    }
  }

  switch (patrol.state) {
    case "patrol": {
      const speed = patrol.kind === "spider" ? T.SPIDER_SPEED : T.PATROL_SPEED;
      if (walkTowards(patrol, patrol.route[patrol.routeIndex]!, speed)) {
        patrol.routeIndex = (patrol.routeIndex + 1) % patrol.route.length;
      }
      break;
    }
    case "suspicious": {
      if (sees) patrol.target = { x: player.x, y: player.y };
      if (followPath(patrol, T.SEARCH_SPEED)) {
        patrol.timer -= T.SIM_DT;
        patrol.facing += 1.4 * T.SIM_DT;
        if (patrol.timer <= 0) returnToBeat(world, patrol);
      }
      break;
    }
    case "chase": {
      const tracking = patrol.kind === "spider" ? hears : sees;
      if (tracking) {
        patrol.target = { x: player.x, y: player.y };
        patrol.timer = T.LOSE_SIGHT_SECONDS;
      } else {
        patrol.timer -= T.SIM_DT;
      }
      if (patrol.kind === "orc" && player.ringOn) patrol.timer = Math.min(patrol.timer, 0);
      patrol.patience -= T.SIM_DT;
      if (patrol.kind === "spider" && patrol.patience <= 0) patrol.timer = 0;
      if (patrol.timer <= 0) {
        patrol.alert = 0.5;
        if (patrol.kind === "orc") suspect(world, patrol, patrol.target ?? patrol);
        else returnToBeat(world, patrol);
        break;
      }
      patrol.repath -= 1;
      if (patrol.repath <= 0 && patrol.target) {
        patrol.path = findPath(map, patrol, patrol.target);
        patrol.repath = 15;
      }
      followPath(patrol, patrol.kind === "spider" ? T.SPIDER_CHASE : T.CHASE_SPEED);
      break;
    }
    case "return": {
      if (followPath(patrol, T.SEARCH_SPEED)) patrol.state = "patrol";
      break;
    }
  }
}

function capturedBy(world: World): LossCause | null {
  const { player } = world;
  for (const patrol of world.patrols) {
    if (Math.hypot(patrol.x - player.x, patrol.y - player.y) > T.CAPTURE_RANGE) continue;
    if (patrol.kind === "spider") return "spider";
    if (!player.ringOn) return "patrol";
  }
  return null;
}

function lose(world: World, cause: LossCause, events: GameEvent[]): void {
  world.phase = "lost";
  world.cause = cause;
  events.push("lost");
}

function enterStage(world: World, index: number): void {
  const { map, patrols, pickups } = generateStage(world.seed, index);
  const rng = createRng(world.rng);
  world.stageIndex = index;
  world.map = map;
  world.patrols = patrols;
  world.pickups = pickups;
  world.player = newPlayer(map, world.player.ringOn);
  world.eye = newEye(map, rng);
  world.rng = rng.state;
  world.exposure = 0;
  world.phase = "briefing";
}

function cloneForStep(world: World, events: GameEvent[]): World {
  return {
    ...world,
    player: { ...world.player },
    eye: { ...world.eye },
    patrols: world.patrols.map((patrol) => ({ ...patrol, path: [...patrol.path] })),
    pickups: world.pickups.map((pickup) => ({ ...pickup })),
    stats: { ...world.stats },
    events,
  };
}

/** Advances one fixed tick. Never mutates `world`. */
export function step(world: World, input: StepInput): World {
  const events: GameEvent[] = [];
  if (world.phase === "lost" || world.phase === "won") {
    return world.events.length === 0 ? world : { ...world, events };
  }
  if (world.phase === "briefing") {
    if (!input.confirm) return world.events.length === 0 ? world : { ...world, events };
    events.push("stage-start");
    return { ...world, phase: "playing", events };
  }

  const next = cloneForStep(world, events);
  next.tick += 1;
  next.stats.ticks += 1;
  updateRing(next, input.ring, events);
  updatePlayer(next, input, events);
  updateEye(next, events);
  for (const patrol of next.patrols) updatePatrol(next, patrol, events);

  if (next.burden >= 1) {
    next.burden = 1;
    lose(next, "burden", events);
  } else if (next.exposure >= 1) {
    lose(next, "eye", events);
  } else {
    const captor = capturedBy(next);
    if (captor) lose(next, captor, events);
  }
  if (next.phase === "lost") return next;

  const { player, map } = next;
  if (Math.hypot(map.exit.x - player.x, map.exit.y - player.y) < 1) {
    events.push("stage-clear");
    if (next.stageIndex === STAGE_IDS.length - 1) {
      next.phase = "won";
      events.push("won");
    } else {
      enterStage(next, next.stageIndex + 1);
    }
  }
  return next;
}

/** True if a tile can be stood on; used by tests and the bot. */
export { isPassable };
