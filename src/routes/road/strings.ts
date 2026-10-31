// Labels road.ts does not carry. Owned here because src/content is frozen; for WO-0001.2's owner to
// review and absorb.
import type { RoadInstruction } from "../../content/road";

export const extraHud = {
  burden: "Burden",
  water: "Water",
  sneaking: "Sneaking",
  walking: "On foot",
  regionLabel: "The Last Road, playing field",
  statusLabel: "Exercise status",
  restart: "Restart the exercise",
  proceed: "Proceed",
  pausedTitle: "Exercise suspended",
  bestLabel: "Best on file",
  bestNone: "No attempt on file.",
  stageOf: (index: number, total: number) => `${index} of ${total}`,
  bestWon: (time: string, burden: number) => `Completed in ${time}, burden ${burden}%.`,
  bestReached: (name: string) => `Reached ${name}.`,
  noCanvas: "This device cannot draw the field. The written account below stands in for it.",
};

export const extraInstructions: RoadInstruction[] = [
  { action: "Sneak", keys: "Hold Shift", detail: "Slower and quieter. Patrols hear less and must come closer to see you." },
  { action: "Burden", keys: "Watch the meter", detail: "Rises for as long as the Ring is worn, faster with every use, and never falls. Full, and the run is over." },
  { action: "Water", keys: "Find the skins", detail: "Runs down always, faster in the ash pits and on the mountain. Dry, you slow and the burden grows." },
  { action: "Touch", keys: "Stick, Ring, Pause", detail: "A light push on the stick sneaks; a full push walks." },
];

export const reducedMotionNotice =
  "Reduced motion is on. The Eye's beam still sweeps, because the game depends on it. All other decorative motion is off, and you can pause at any time.";

export const fieldHeading = "The field";
export const fieldDescription = [
  "A top-down stealth game in four stages, played on a canvas. You are a small figure seen from above, in a pool of light with darkness around it. The chart at the top right shows the whole stage.",
  "A red cone, the gaze of the Eye, sweeps the land from the north. Darkened ground to the south of a rock is shadow: the gaze passes over you there. Caught in the open too long, your exposure fills and the run ends.",
  "Patrols walk beats with pale vision cones. A question mark over one means it suspects you; an exclamation mark means it is coming. In Cirith Ungol, spiders keep to their halls: they hear rather than see, and the Ring does not hide you from them.",
  "The pale square is the way out of the stage. The triangles are water.",
];
export const controlsHeading = "Standing instructions";
