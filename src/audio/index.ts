import { createEngine } from "./engine";
import type { CueName, DroneEngine } from "./engine";

let engine: DroneEngine | null = null;
let on = false;
let wraith = false;
let tension = 0;

/** Call synchronously in the click handler: iOS Safari will not start audio otherwise. */
export function enableAudio(): void {
  if (on) return;
  engine ??= createEngine();
  if (!engine) return;
  on = true;
  engine.setWraith(wraith);
  engine.setTension(tension);
  engine.fadeIn();
}

export function disableAudio(): void {
  if (!on) return;
  on = false;
  engine?.fadeOut();
}

export function setWraith(next: boolean): void {
  wraith = next;
  if (on) engine?.setWraith(next);
}

/** 0-1. Opens the filter slowly as attention climbs; never changes volume. */
export function setTension(next: number): void {
  tension = next;
  if (on) engine?.setTension(next);
}

export function cue(name: CueName): void {
  if (on) engine?.cue(name);
}
