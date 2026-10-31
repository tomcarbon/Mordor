// The identification mark on each file. The Directorate does not hold portraits, so no file can
// depict anyone: each mark is an abstract brand derived from the file id, mirrored on its spine.
// That rule is what keeps Gothmog, in particular, clear of any film image.
import { createRng, hashText } from "../_shared/rng";

export const MARK_WIDTH = 64;
export const MARK_HEIGHT = 96;
const AXIS = MARK_WIDTH / 2;

type Point = [number, number];

/** The right-hand half of the brand, as polygons. */
export function markHalf(id: string): Point[][] {
  const rng = createRng(hashText(id));
  const polygons: Point[][] = [];
  let y = 4 + rng() * 6;
  while (y < MARK_HEIGHT - 16) {
    const height = 9 + rng() * 14;
    const reach = 14 + rng() * 16;
    const droop = (rng() - 0.35) * 16;
    polygons.push([
      [AXIS + 2.5, y],
      [AXIS + reach, y + height * 0.4 + droop],
      [AXIS + reach * (0.45 + rng() * 0.3), y + height + droop * 0.5],
      [AXIS + 2.5, y + height * 0.8],
    ]);
    y += height + 3 + rng() * 5;
  }
  return polygons;
}

function pathOf(polygon: Point[]): string {
  return `${polygon.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z`;
}

export function markPath(id: string): string {
  const half = markHalf(id);
  const mirrored = half.map((polygon) => polygon.map(([x, y]): Point => [MARK_WIDTH - x, y]));
  return [...half, ...mirrored].map(pathOf).join("");
}
