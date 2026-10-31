// World is plain JSON: no classes, typed arrays or functions, so saves, tests and replays stay simple.

export const STAGE_IDS = ["cirith-ungol", "morgai", "gorgoroth", "orodruin"] as const;
export type StageKey = (typeof STAGE_IDS)[number];

export const FLOOR = 0;
/** Solid, blocks sight, casts the Eye's shadow. */
export const ROCK = 1;
/** Ash pit: slow and thirsty, but it hides you from a patrol's eyes. */
export const PIT = 2;
/** Spider web: slow, and it tells every spider near where you are. */
export const WEB = 3;
/** Thorn scrub: a little slow, and a patrol has to come close to see into it. */
export const THORN = 4;
/** Impassable, sees through, casts no shadow. */
export const LAVA = 5;
export type Tile = typeof FLOOR | typeof ROCK | typeof PIT | typeof WEB | typeof THORN | typeof LAVA;

export interface Vec {
  x: number;
  y: number;
}

/** Everything generated for a stage that does not change during play. */
export interface StageMap {
  id: StageKey;
  width: number;
  height: number;
  /** Row-major, width * height. */
  tiles: number[];
  start: Vec;
  exit: Vec;
  /** Where the gaze comes from: always above the map, so angles stay inside (0, PI). */
  origin: Vec;
  sweepMin: number;
  sweepMax: number;
  /** Half the cone, in radians. */
  beamHalf: number;
  /** Radians per second. */
  sweepSpeed: number;
  /** How far, in tiles, a rock's shadow falls. */
  shadowLength: number;
}

export type PatrolKind = "orc" | "spider";
export type PatrolState = "patrol" | "suspicious" | "chase" | "return";

export interface Patrol {
  id: number;
  kind: PatrolKind;
  x: number;
  y: number;
  /** Radians. */
  facing: number;
  state: PatrolState;
  /** 0-1. At 1 a patrol gives chase. */
  alert: number;
  /** Closed loop of tile centres. Shared between steps and never changed. */
  route: Vec[];
  routeIndex: number;
  /** Tile centres still to walk off-route. */
  path: Vec[];
  target: Vec | null;
  /** Seconds left at the current suspicion, or without sight of the prey. */
  timer: number;
  /** Seconds a spider will run before it goes home. */
  patience: number;
  repath: number;
}

export interface Pickup {
  x: number;
  y: number;
  taken: boolean;
}

export type EyeMode = "sweep" | "hunt" | "linger";

export interface Eye {
  angle: number;
  /** +1 or -1. */
  dir: 1 | -1;
  mode: EyeMode;
  /** Seconds left lingering where it lost you. */
  linger: number;
  locked: boolean;
}

export interface Player {
  x: number;
  y: number;
  facing: number;
  moving: boolean;
  sneaking: boolean;
  ringOn: boolean;
  inBeam: boolean;
  inShadow: boolean;
  /** Tiles at which this step's footfall can be heard. */
  noise: number;
}

export type Phase = "briefing" | "playing" | "lost" | "won";
export type LossCause = "eye" | "patrol" | "spider" | "burden";

export type GameEvent =
  | "stage-start"
  | "stage-clear"
  | "ring-on"
  | "ring-off"
  | "eye-locked"
  | "eye-called"
  | "spotted"
  | "web"
  | "pickup"
  | "dry"
  | "lost"
  | "won";

export interface RunStats {
  /** Ticks spent playing. */
  ticks: number;
  spotted: number;
  pickups: number;
}

export interface World {
  seed: number;
  rng: number;
  tick: number;
  phase: Phase;
  stageIndex: number;
  map: StageMap;
  player: Player;
  eye: Eye;
  patrols: Patrol[];
  pickups: Pickup[];
  /** 0-1. At 1 the Eye has you. Resets each stage. */
  exposure: number;
  /** 0-1. Never falls. At 1 the run is over. */
  burden: number;
  ringUses: number;
  /** 0-1. */
  water: number;
  cause: LossCause | null;
  stats: RunStats;
  /** What happened in the last step only. */
  events: GameEvent[];
}

export interface StepInput {
  /** -1 to 1. A longer vector is clamped. */
  moveX: number;
  moveY: number;
  sneak: boolean;
  /** Level, not edge: the route passes the site's Ring state. */
  ring: boolean;
  /** Leaves a briefing. */
  confirm: boolean;
}

export const IDLE_INPUT: StepInput = { moveX: 0, moveY: 0, sneak: false, ring: false, confirm: false };
