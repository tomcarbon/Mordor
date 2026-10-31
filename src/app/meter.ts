import { attentionLevels, observations } from "../content/eye";
import type { AttentionLevel, Observation } from "../content/eye";

export function levelFor(attention: number): AttentionLevel {
  let current = attentionLevels[0]!;
  for (const level of attentionLevels) {
    if (attention >= level.threshold) current = level;
  }
  return current;
}

export function eligibleObservations(ring: boolean): Observation[] {
  return observations.filter((o) => o.when === "any" || o.when === (ring ? "ringOn" : "ringOff"));
}

/** Random, but never the line just shown. `random` is injectable for tests. */
export function pickObservation(
  ring: boolean,
  lastId: string | null,
  random: () => number = Math.random,
): Observation {
  const pool = eligibleObservations(ring).filter((o) => o.id !== lastId);
  return pool[Math.floor(random() * pool.length)]!;
}
