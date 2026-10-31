// Every number that sets the feel of the game. Tuned against the headless bots in bot.ts.
import type { StageKey } from "./types";

export const SIM_DT = 1 / 60;

export const WALK_SPEED = 4.6; // tiles per second
export const SNEAK_SPEED = 2.3;
export const PLAYER_RADIUS = 0.3;
export const PIT_SPEED = 0.55;
export const WEB_SPEED = 0.6;
export const THORN_SPEED = 0.78;
/** Speed lost at a full burden. */
export const BURDEN_DRAG = 0.2;
export const DRY_SPEED = 0.72;

export const WALK_NOISE = 5;
export const SNEAK_NOISE = 1.3;

/** Burden per second worn, on the first use. */
export const RING_RATE = 0.022;
/** Extra rate per earlier use: the sixth use costs twice the first. */
export const RING_GROWTH = 0.2;
/** Paid once on every use, so blinking the Ring is not free. */
export const RING_TAP = 0.008;
/** Burden per second once the water is gone. */
export const DRY_BURDEN = 0.012;

export const WATER_PICKUP = 0.22;
export const PIT_THIRST = 2;

/** Exposure lost per second out of the gaze. */
export const EXPOSURE_DECAY = 0.13;
/** Multiplier on the stage's exposure rate while worn. */
export const RING_EXPOSURE = 2.2;
/** Under a rock with the Ring on, the gaze still finds you, at this share of the open rate. */
export const RING_SHADOW_EXPOSURE = 0.3;
/** Sweep speed while the gaze is on you in the open. */
export const EYE_SNAG = 0.7;
/** Turn speed once the Ring is on, as a multiple of the sweep. */
export const EYE_HUNT = 2.6;
export const EYE_LINGER = 1.3;
/** At this exposure the Eye names your position to the patrols near you. */
export const EYE_CALL = 0.6;
export const EYE_CALL_RANGE = 14;

export const PATROL_SPEED = 1.7;
export const SEARCH_SPEED = 2.3;
export const CHASE_SPEED = 4.15;
export const SPIDER_SPEED = 1.8;
export const SPIDER_CHASE = 3.2;
export const TURN_RATE = 3.2;
export const VISION_RANGE = 7.5;
export const VISION_HALF = 0.68;
/** A patrol notices anything this close, whichever way it faces. */
export const TOUCH_SENSE = 1.2;
export const CAPTURE_RANGE = 0.65;
export const SNEAK_VISION = 0.8;
export const THORN_VISION = 0.5;
export const PIT_VISION = 0.65;
export const SHADOW_VISION = 0.8;
/** Alert per second at point-blank range. */
export const ALERT_RATE = 1.6;
export const ALERT_DECAY = 0.45;
export const SUSPICION_ALERT = 0.5;
export const SEARCH_SECONDS = 3;
export const LOSE_SIGHT_SECONDS = 1.5;
export const SPIDER_PATIENCE = 3.5;
export const SPIDER_HEARING = 1;
export const HEARING_THROUGH_ROCK = 2.5;
export const WEB_ALARM_RANGE = 9;
export const ALARM_SPREAD = 8;

export interface StageTuning {
  width: number;
  height: number;
  /** Fraction of the width the gaze comes from. */
  originX: number;
  shadowLength: number;
  /** Width of the cone across the map's middle, in tiles. */
  beamTiles: number;
  /** One traverse of the map, in seconds. */
  sweepSeconds: number;
  /** Seconds of the open gaze until you are found. */
  eyeSeconds: number;
  waterDrain: number;
  /** Burden gained per second just by being here. */
  burdenDrift: number;
  ringBurden: number;
}

export const STAGE_TUNING: Record<StageKey, StageTuning> = {
  "cirith-ungol": {
    width: 54, height: 34, originX: 0.75, shadowLength: 6, beamTiles: 8, sweepSeconds: 9,
    eyeSeconds: 3.2, waterDrain: 0.009, burdenDrift: 0, ringBurden: 1,
  },
  morgai: {
    width: 72, height: 38, originX: 0.6, shadowLength: 6, beamTiles: 9, sweepSeconds: 8.5,
    eyeSeconds: 3, waterDrain: 0.0095, burdenDrift: 0, ringBurden: 1,
  },
  gorgoroth: {
    width: 96, height: 48, originX: 0.7, shadowLength: 5, beamTiles: 12, sweepSeconds: 8.5,
    eyeSeconds: 2.6, waterDrain: 0.01, burdenDrift: 0, ringBurden: 1,
  },
  orodruin: {
    width: 46, height: 72, originX: 0.5, shadowLength: 3, beamTiles: 9, sweepSeconds: 7,
    eyeSeconds: 3, waterDrain: 0.015, burdenDrift: 0.002, ringBurden: 1.4,
  },
};
