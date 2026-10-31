// @vitest-environment node
import { describe, expect, it } from "vitest";
import { distanceField, findPath, inShadow, isPassable } from "./grid";
import { canPatrolSee, createWorld, IDLE_INPUT, SIM_DT, STAGE_IDS, step } from "./index";
import type { Patrol, StepInput, World } from "./index";
import { generateStage } from "./mapgen";
import { createRng, random } from "./rng";
import * as T from "./tuning";
import { FLOOR, LAVA, PIT, ROCK, WEB } from "./types";

const SEEDS = [1, 7, 42, 1234, 99999, 0xdeadbeef];
const WIDTH = 40;
const HEIGHT = 30;

/** A bare arena with the gaze pinned far away, so each test sets up only what it is about. */
function arena(edit?: (tiles: number[]) => void): World {
  const base = createWorld(5);
  const tiles = new Array<number>(WIDTH * HEIGHT).fill(FLOOR);
  edit?.(tiles);
  return {
    ...base,
    phase: "playing",
    patrols: [],
    pickups: [],
    eye: { angle: 0.01, dir: 1, mode: "sweep", linger: 0, locked: false },
    player: { ...base.player, x: 20.5, y: 20.5 },
    map: {
      ...base.map, id: "morgai", width: WIDTH, height: HEIGHT, tiles,
      start: { x: 2.5, y: 2.5 }, exit: { x: 38.5, y: 2.5 },
      origin: { x: 20.5, y: -30 }, sweepMin: 0.01, sweepMax: 0.2, beamHalf: 0.12, sweepSpeed: 0.1, shadowLength: 5,
    },
  };
}

function aimAtPlayer(world: World): World {
  const { origin } = world.map;
  return { ...world, eye: { ...world.eye, angle: Math.atan2(world.player.y - origin.y, world.player.x - origin.x) } };
}

function patrol(overrides: Partial<Patrol>): Patrol {
  return {
    id: 0, kind: "orc", x: 20.5, y: 16.5, facing: Math.PI / 2, state: "patrol", alert: 0,
    route: [{ x: 20.5, y: 16.5 }, { x: 20.5, y: 15.5 }], routeIndex: 0, path: [], target: null,
    timer: 0, patience: 0, repath: 0, ...overrides,
  };
}

/** Freezes everything reachable, so any write to a World throws: test files are strict mode. */
function deepFreeze<V>(value: V): V {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function run(world: World, input: Partial<StepInput>, seconds: number): World {
  let current = world;
  const ticks = Math.round(seconds / SIM_DT);
  for (let i = 0; i < ticks; i += 1) current = step(current, { ...IDLE_INPUT, ...input });
  return current;
}

describe("rng", () => {
  it("repeats from a seed and stays in range", () => {
    const a = createRng(9);
    const b = createRng(9);
    for (let i = 0; i < 100; i += 1) {
      const value = random(a);
      expect(value).toBe(random(b));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("determinism", () => {
  function script(tick: number): StepInput {
    return {
      moveX: Math.sin(tick / 37), moveY: Math.cos(tick / 53), sneak: tick % 400 < 120,
      ring: tick % 900 > 800, confirm: tick % 200 === 0,
    };
  }

  function play(seed: number, ticks: number): World {
    let world = createWorld(seed);
    for (let tick = 0; tick < ticks; tick += 1) world = step(world, script(tick));
    return world;
  }

  it("gives a deep-equal World from the same seed and inputs", () => {
    // 2000 ticks: this script is caught at tick 2072, and a finished World proves nothing further.
    const world = play(77, 2000);
    expect(world.phase).toBe("playing");
    expect(world).toEqual(play(77, 2000));
  });

  it("differs between seeds", () => {
    expect(createWorld(1).map.tiles).not.toEqual(createWorld(2).map.tiles);
  });

  it("never mutates the World it is given, through a chase to the end of a run", () => {
    let world = deepFreeze(createWorld(77));
    let spotted = false;
    for (let tick = 0; tick < 2200; tick += 1) {
      world = deepFreeze(step(world, script(tick)));
      spotted ||= world.events.includes("spotted");
    }
    expect(spotted).toBe(true);
    expect(world.phase).toBe("lost");
  });

  it("survives a JSON round trip mid-run", () => {
    // 600 ticks: by 900 this script has lost, and a lost World never steps again.
    const world = play(11, 600);
    expect(world.phase).toBe("playing");
    const copy = JSON.parse(JSON.stringify(world)) as World;
    const resumed = run(copy, { moveX: 1 }, 1);
    expect(resumed.tick).toBeGreaterThan(world.tick);
    expect(resumed).toEqual(run(world, { moveX: 1 }, 1));
  });
});

describe("generated stages", () => {
  for (const seed of SEEDS) {
    STAGE_IDS.forEach((id, index) => {
      it(`${id} seed ${seed}: exit and water are reachable, patrols stay on the ground`, () => {
        const { map, patrols, pickups } = generateStage(seed, index);
        const field = distanceField(map, map.exit);
        const at = (x: number, y: number): number => field[Math.floor(y) * map.width + Math.floor(x)]!;
        expect(at(map.start.x, map.start.y)).toBeGreaterThan(0);
        expect(pickups.length).toBeGreaterThan(0);
        for (const pickup of pickups) expect(at(pickup.x, pickup.y)).toBeGreaterThanOrEqual(0);
        expect(patrols.length).toBeGreaterThan(0);
        for (const p of patrols) {
          for (const point of p.route) expect(isPassable(map, point.x, point.y)).toBe(true);
          expect(Math.hypot(p.x - map.start.x, p.y - map.start.y)).toBeGreaterThanOrEqual(10);
        }
        const path = findPath(map, map.start, map.exit);
        expect(path.at(-1)).toEqual(map.exit);
      });
    });
  }

  it("holds on the road for further seeds, as every real run draws a fresh one", () => {
    for (let n = 0; n < 40; n += 1) {
      const seed = Math.imul(n + 1, 2654435761) >>> 0;
      STAGE_IDS.forEach((_, index) => {
        const { map, pickups } = generateStage(seed, index);
        const field = distanceField(map, map.exit);
        const at = (x: number, y: number): number => field[Math.floor(y) * map.width + Math.floor(x)]!;
        expect(at(map.start.x, map.start.y), `seed ${seed} stage ${index}`).toBeGreaterThan(0);
        expect(pickups.length, `seed ${seed} stage ${index}`).toBeGreaterThan(0);
        for (const pickup of pickups) expect(at(pickup.x, pickup.y), `seed ${seed} stage ${index}`).toBeGreaterThanOrEqual(0);
      });
    }
  }, 30_000);

  it("gives each stage its own terrain", () => {
    const share = (tiles: number[], tile: number): number => tiles.filter((t) => t === tile).length / tiles.length;
    const [cirith, morgai, plain, mountain] = [0, 1, 2, 3].map((i) => generateStage(21, i).map);
    expect(share(cirith!.tiles, ROCK)).toBeGreaterThan(0.5);
    expect(share(cirith!.tiles, WEB)).toBeGreaterThan(0);
    expect(share(morgai!.tiles, ROCK)).toBeLessThan(0.3);
    expect(share(plain!.tiles, ROCK)).toBeLessThan(0.1);
    expect(share(plain!.tiles, PIT)).toBeGreaterThan(0.03);
    expect(share(mountain!.tiles, ROCK)).toBeLessThan(0.02);
    expect(share(mountain!.tiles, LAVA)).toBeGreaterThan(0.05);
    expect(generateStage(21, 2).patrols.length).toBeGreaterThan(generateStage(21, 1).patrols.length);
  });
});

describe("the Eye", () => {
  it("fills exposure in the open, and ends the run", () => {
    const world = aimAtPlayer(arena());
    const stay = run(world, {}, 0.5);
    expect(stay.exposure).toBeGreaterThan(0);
    let current = world;
    let guard = 0;
    while (current.phase === "playing" && guard < 2000) {
      current = aimAtPlayer(step(current, IDLE_INPUT));
      guard += 1;
    }
    expect(current.phase).toBe("lost");
    expect(current.cause).toBe("eye");
    expect(current.events).toContain("lost");
    expect(guard * SIM_DT).toBeCloseTo(T.STAGE_TUNING.morgai.eyeSeconds, 0);
  });

  it("misses a player outside the cone, and exposure drains", () => {
    const world = { ...arena(), exposure: 0.5 };
    const later = run(world, {}, 1);
    expect(later.player.inBeam).toBe(false);
    expect(later.exposure).toBeCloseTo(0.5 - T.EXPOSURE_DECAY, 2);
  });

  it("names your position to orcs in range when exposure passes the call, and to no others", () => {
    const near = patrol({ id: 1, y: 10.5, facing: -Math.PI / 2, route: [{ x: 20.5, y: 10.5 }] });
    const far = patrol({ id: 2, y: 2.5, facing: -Math.PI / 2, route: [{ x: 20.5, y: 2.5 }] });
    const world = aimAtPlayer({ ...arena(), exposure: T.EYE_CALL - 0.0001, patrols: [near, far] });
    const called = step(world, IDLE_INPUT);
    expect(called.events).toContain("eye-called");
    expect(called.patrols.map((p) => p.state)).toEqual(["suspicious", "patrol"]);
  });

  it("sweeps to the end of its arc and turns back", () => {
    const world = arena();
    const later = run(world, {}, (0.19 / world.map.sweepSpeed) * 1.1);
    expect(later.eye.dir).toBe(-1);
  });
});

describe("shadow", () => {
  const rockAbove = (tiles: number[]): void => {
    tiles[18 * WIDTH + 20] = ROCK;
  };

  it("falls away from the Eye for the stage's length, and no further", () => {
    const { map } = arena(rockAbove);
    expect(inShadow(map, 20.5, 20.5)).toBe(true);
    expect(inShadow(map, 20.5, 16.5)).toBe(false);
    expect(inShadow(map, 20.5, 26.5)).toBe(false);
    expect(inShadow(map, 26.5, 20.5)).toBe(false);
  });

  it("stops the gaze filling exposure", () => {
    const world = aimAtPlayer(arena(rockAbove));
    const later = run(world, {}, 1);
    expect(later.player.inBeam).toBe(true);
    expect(later.player.inShadow).toBe(true);
    expect(later.exposure).toBe(0);
  });

  it("lava casts no shadow", () => {
    const { map } = arena((tiles) => {
      tiles[18 * WIDTH + 20] = LAVA;
    });
    expect(inShadow(map, 20.5, 20.5)).toBe(false);
  });
});

describe("patrols", () => {
  it("see a player inside the cone, in line, in range", () => {
    const world = { ...arena(), patrols: [patrol({})] };
    expect(canPatrolSee(world, world.patrols[0]!)).toBe(true);
  });

  it("do not see behind them, beyond range, or through rock", () => {
    const behind = { ...arena(), patrols: [patrol({ facing: -Math.PI / 2 })] };
    expect(canPatrolSee(behind, behind.patrols[0]!)).toBe(false);
    const far = { ...arena(), patrols: [patrol({ y: 20.5 - T.VISION_RANGE - 1 })] };
    expect(canPatrolSee(far, far.patrols[0]!)).toBe(false);
    const walled = {
      ...arena((tiles) => {
        tiles[18 * WIDTH + 20] = ROCK;
      }),
      patrols: [patrol({})],
    };
    expect(canPatrolSee(walled, walled.patrols[0]!)).toBe(false);
  });

  it("sneaking shortens the range they see you at", () => {
    const edge = 20.5 - T.VISION_RANGE * 0.95;
    const world = arena();
    const walking = { ...world, patrols: [patrol({ y: edge })] };
    const sneaking = { ...walking, player: { ...walking.player, sneaking: true } };
    expect(canPatrolSee(walking, walking.patrols[0]!)).toBe(true);
    expect(canPatrolSee(sneaking, sneaking.patrols[0]!)).toBe(false);
  });

  it("go from suspicion to a chase, and a chase ends in capture", () => {
    const world = { ...arena(), patrols: [patrol({ route: [{ x: 20.5, y: 16.5 }] })] };
    const suspicious = run(world, {}, 0.6);
    expect(suspicious.patrols[0]!.state).toBe("suspicious");
    let current = world;
    let spotted = false;
    for (let i = 0; i < 900 && current.phase === "playing"; i += 1) {
      current = step(current, IDLE_INPUT);
      spotted ||= current.events.includes("spotted");
    }
    expect(spotted).toBe(true);
    expect(current.cause).toBe("patrol");
  });

  it("hear a walker but not a sneaker", () => {
    const blind = { ...patrol({ y: 17.5 }), facing: -Math.PI / 2, route: [{ x: 20.5, y: 17.5 }] };
    const world = { ...arena(), patrols: [blind] };
    expect(step(world, { ...IDLE_INPUT, moveX: 1 }).patrols[0]!.state).toBe("suspicious");
    // The same distance: a further patrol would pass this if sneaking changed nothing.
    expect(step(world, { ...IDLE_INPUT, moveX: 1, sneak: true }).patrols[0]!.state).toBe("patrol");
  });

  it("spiders ignore sight and the Ring, and hear a walker", () => {
    const spider = patrol({ kind: "spider", y: 18.5, facing: -Math.PI / 2, route: [{ x: 20.5, y: 18.5 }] });
    const world = { ...arena(), patrols: [spider] };
    expect(canPatrolSee(world, spider)).toBe(false);
    const stirred = step(world, { ...IDLE_INPUT, moveX: 1, ring: true });
    expect(stirred.patrols[0]!.state).toBe("chase");
    const touched = { ...world, patrols: [{ ...spider, y: 20.5 }] };
    expect(step(touched, { ...IDLE_INPUT, ring: true }).cause).toBe("spider");
  });
});

describe("webs", () => {
  it("wake a spider beyond its hearing, when walked into", () => {
    const spider = patrol({ kind: "spider", y: 12.5, facing: -Math.PI / 2, route: [{ x: 20.5, y: 12.5 }] });
    const bare = { ...arena(), patrols: [spider] };
    const start = { ...bare.player, x: 20.95 };
    expect(step({ ...bare, player: start }, { ...IDLE_INPUT, moveX: 1 }).patrols[0]!.state).toBe("patrol");
    const webbed = arena((tiles) => {
      tiles[20 * WIDTH + 21] = WEB;
    });
    const caught = step({ ...webbed, player: start, patrols: [spider] }, { ...IDLE_INPUT, moveX: 1 });
    expect(caught.events).toContain("web");
    expect(caught.patrols[0]!.state).toBe("chase");
  });
});

describe("the Ring", () => {
  it("hides you from a patrol, and a chase breaks off", () => {
    const world = { ...arena(), patrols: [patrol({ state: "chase", alert: 1, target: { x: 20.5, y: 20.5 }, timer: 2 })] };
    const worn = step(world, { ...IDLE_INPUT, ring: true });
    expect(worn.player.ringOn).toBe(true);
    expect(canPatrolSee(worn, worn.patrols[0]!)).toBe(false);
    expect(worn.patrols[0]!.state).toBe("suspicious");
  });

  it("stops a patrol's touch from taking you", () => {
    const world = { ...arena(), patrols: [patrol({ y: 20.5, route: [{ x: 20.5, y: 20.5 }] })] };
    expect(step(world, IDLE_INPUT).cause).toBe("patrol");
    expect(step(world, { ...IDLE_INPUT, ring: true }).phase).toBe("playing");
  });

  it("turns the Eye onto you fast, and it fills exposure faster", () => {
    const aimed = aimAtPlayer(arena());
    const world = { ...aimed, eye: { ...aimed.eye, angle: aimed.eye.angle - 0.3 } };
    const worn = run(world, { ring: true }, 1);
    expect(worn.eye.mode).toBe("hunt");
    expect(worn.player.inBeam).toBe(true);
    const bare = run(aimAtPlayer(arena()), {}, 0.2);
    const held = run(aimed, { ring: true }, 0.2);
    expect(held.exposure).toBeGreaterThan(bare.exposure * 1.8);
  });

  it("is not safe under rock, but is safer there", () => {
    const shaded = aimAtPlayer(arena((tiles) => {
      tiles[18 * WIDTH + 20] = ROCK;
    }));
    const inShade = run(shaded, { ring: true }, 0.4);
    const inOpen = run(aimAtPlayer(arena()), { ring: true }, 0.4);
    expect(inShade.exposure).toBeGreaterThan(0);
    expect(inShade.exposure).toBeLessThan(inOpen.exposure);
  });

  it("lingers on where it lost you, then sweeps again", () => {
    const worn = run(arena(), { ring: true }, 1);
    const off = run(worn, {}, 0.5);
    expect(off.eye.mode).toBe("linger");
    expect(run(off, {}, T.EYE_LINGER + 0.2).eye.mode).toBe("sweep");
  });
});

describe("burden", () => {
  it("climbs only while worn, and never falls", () => {
    const world = arena();
    expect(run(world, {}, 1).burden).toBe(0);
    const worn = run(world, { ring: true }, 1);
    expect(worn.burden).toBeCloseTo(T.RING_TAP + T.RING_RATE, 3);
    expect(run(worn, {}, 1).burden).toBe(worn.burden);
  });

  it("climbs faster with every use", () => {
    const spend = (world: World): number => {
      const on = step(world, { ...IDLE_INPUT, ring: true });
      return run(on, { ring: true }, 1).burden - on.burden;
    };
    const first = spend(arena());
    const used = { ...arena(), ringUses: 5 };
    expect(spend(used)).toBeCloseTo(first * (1 + 5 * T.RING_GROWTH), 3);
    expect(spend(used)).toBeGreaterThan(first * 1.9);
  });

  it("counts each use once and charges for it", () => {
    let world = arena();
    for (let i = 0; i < 3; i += 1) {
      world = step(world, { ...IDLE_INPUT, ring: true });
      world = step(world, IDLE_INPUT);
    }
    expect(world.ringUses).toBe(3);
    expect(world.burden).toBeGreaterThanOrEqual(T.RING_TAP * 3);
  });

  it("grows by itself on the mountain, and the Ring weighs more there", () => {
    const base = arena();
    const mountain: World = { ...base, map: { ...base.map, id: "orodruin" } };
    const tuning = T.STAGE_TUNING.orodruin;
    expect(tuning.burdenDrift).toBeGreaterThan(0);
    expect(tuning.ringBurden).toBeGreaterThan(1);
    expect(run(mountain, {}, 1).burden).toBeCloseTo(tuning.burdenDrift, 4);
    const worn = run(mountain, { ring: true }, 1).burden;
    expect(worn).toBeCloseTo(T.RING_TAP + T.RING_RATE * tuning.ringBurden + tuning.burdenDrift, 3);
  });

  it("ends the run when full", () => {
    const world = step({ ...arena(), burden: 0.9999 }, { ...IDLE_INPUT, ring: true });
    expect(world.phase).toBe("lost");
    expect(world.cause).toBe("burden");
    expect(world.burden).toBe(1);
  });

  it("slows the bearer", () => {
    const fresh = run(arena(), { moveX: 1 }, 1);
    const laden = run({ ...arena(), burden: 0.9 }, { moveX: 1 }, 1);
    expect(laden.player.x - 20.5).toBeLessThan(fresh.player.x - 20.5);
  });
});

describe("water", () => {
  it("runs down at the stage's rate, twice as fast in a pit", () => {
    const drain = T.STAGE_TUNING.morgai.waterDrain;
    expect(1 - run(arena(), {}, 2).water).toBeCloseTo(drain * 2, 4);
    const pit = arena((tiles) => {
      tiles[20 * WIDTH + 20] = PIT;
    });
    expect(1 - run(pit, {}, 2).water).toBeCloseTo(drain * 2 * T.PIT_THIRST, 4);
  });

  it("refills once from a pickup", () => {
    const world = { ...arena(), water: 0.3, pickups: [{ x: 20.5, y: 20.5, taken: false }] };
    const drunk = step(world, IDLE_INPUT);
    expect(drunk.events).toContain("pickup");
    expect(drunk.water).toBeGreaterThan(0.5);
    expect(drunk.pickups[0]!.taken).toBe(true);
    expect(step(drunk, IDLE_INPUT).events).not.toContain("pickup");
  });

  it("gone, you slow and the burden grows", () => {
    const dry = { ...arena(), water: 0 };
    const moved = run(dry, { moveX: 1 }, 1);
    const fine = run(arena(), { moveX: 1 }, 1);
    expect(moved.player.x).toBeLessThan(fine.player.x);
    expect(moved.burden).toBeGreaterThan(0);
  });
});

describe("movement", () => {
  it("sneaking is slower and quieter", () => {
    const walk = run(arena(), { moveX: 1 }, 1);
    const sneak = run(arena(), { moveX: 1, sneak: true }, 1);
    expect(sneak.player.x - 20.5).toBeLessThan((walk.player.x - 20.5) * 0.6);
    expect(sneak.player.noise).toBeLessThan(walk.player.noise);
  });

  it("does not walk through rock or lava, and diagonals are not faster", () => {
    const walled = arena((tiles) => {
      for (let y = 0; y < HEIGHT; y += 1) tiles[y * WIDTH + 22] = y % 2 ? ROCK : LAVA;
    });
    expect(run(walled, { moveX: 1 }, 2).player.x).toBeLessThan(22);
    const straight = run(arena(), { moveX: 1 }, 1).player.x - 20.5;
    const diagonal = run(arena(), { moveX: 1, moveY: 1 }, 1);
    expect(Math.hypot(diagonal.player.x - 20.5, diagonal.player.y - 20.5)).toBeCloseTo(straight, 1);
  });
});

describe("win and loss", () => {
  it("waits at a briefing until confirmed", () => {
    const world = createWorld(8);
    expect(world.phase).toBe("briefing");
    expect(step(world, { ...IDLE_INPUT, moveX: 1 }).tick).toBe(0);
    const playing = step(world, { ...IDLE_INPUT, confirm: true });
    expect(playing.phase).toBe("playing");
    expect(playing.events).toContain("stage-start");
  });

  it("carries burden and water to the next stage, and resets exposure", () => {
    const world = createWorld(8);
    const near: World = {
      ...world, phase: "playing", exposure: 0.4, burden: 0.3, water: 0.6,
      player: { ...world.player, x: world.map.exit.x, y: world.map.exit.y },
    };
    const next = step(near, IDLE_INPUT);
    expect(next.events).toContain("stage-clear");
    expect(next.phase).toBe("briefing");
    expect(next.stageIndex).toBe(1);
    expect(next.map.id).toBe("morgai");
    expect(next.exposure).toBe(0);
    expect(next.burden).toBeCloseTo(0.3);
    expect(next.water).toBeLessThanOrEqual(0.6);
    expect(next.water).toBeGreaterThan(0.5);
  });

  it("wins on leaving the last stage", () => {
    const world = createWorld(8);
    const { map } = generateStage(8, 3);
    const last: World = {
      ...world, phase: "playing", stageIndex: 3, map, patrols: [], pickups: [],
      player: { ...world.player, x: map.exit.x, y: map.exit.y },
    };
    const done = step(last, IDLE_INPUT);
    expect(done.phase).toBe("won");
    expect(done.events).toContain("won");
  });

  it("stands still after the end", () => {
    const lost = step({ ...arena(), burden: 1 }, IDLE_INPUT);
    expect(lost.phase).toBe("lost");
    const after = step(lost, { ...IDLE_INPUT, moveX: 1, confirm: true });
    expect(after.phase).toBe("lost");
    expect(after.player.x).toBe(lost.player.x);
  });
});
