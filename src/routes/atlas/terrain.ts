// The survey's linework, generated once from content/atlas.ts and a fixed seed. Pure: paths and
// outlines only. Mountains are hand-drawn in the old manner, one peak at a time, grouped into
// bands from north to south so nearer peaks overlap those behind them.
import { places, ranges } from "../../content/atlas";
import type { MapPoint } from "../../content/atlas";
import { createRng } from "../_shared/rng";

const SEED = 3019;

function placeAt(id: string): MapPoint {
  const place = places.find((item) => item.id === id);
  if (!place) throw new Error(`atlas: no place ${id}`);
  return place;
}

/** Catmull-Rom resample of a polyline to points about `step` apart. */
export function resample(points: MapPoint[], step: number): MapPoint[] {
  const out: MapPoint[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const count = Math.max(1, Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let j = 0; j < count; j += 1) {
      const t = j / count;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

function fixed(value: number): string {
  return value.toFixed(1);
}

function line(points: MapPoint[]): string {
  return points.map((p, i) => `${i ? "L" : "M"}${fixed(p.x)} ${fixed(p.y)}`).join("");
}

function closed(points: MapPoint[]): string {
  return `${line(points)}Z`;
}

/** Roughens a course so that rivers and roads do not look ruled. */
function roughen(points: MapPoint[], amount: number, rng: () => number): MapPoint[] {
  return resample(points, 16).map((p, i, all) =>
    i === 0 || i === all.length - 1
      ? p
      : { x: p.x + (rng() - 0.5) * amount, y: p.y + (rng() - 0.5) * amount },
  );
}

export interface PeakBand {
  id: number;
  /** Filled silhouettes, so a nearer band hides the feet of the band behind. */
  masses: string;
  /** The ridge line alone. A peak drawn with a base line is a tent. */
  ridges: string;
  /** Shading strokes on the eastern flank. */
  hatching: string;
}

const RANGE_SCALE: Record<string, { height: number; spread: number; rows: number; step: number }> = {
  "ephel-duath": { height: 30, spread: 13, rows: 3, step: 11 },
  "ered-lithui": { height: 34, spread: 15, rows: 3, step: 12 },
  morgai: { height: 13, spread: 5, rows: 2, step: 8 },
};

export function buildPeaks(): PeakBand[] {
  const rng = createRng(SEED);
  const bands = new Map<number, { masses: string[]; ridges: string[]; hatching: string[] }>();
  for (const range of ranges) {
    const scale = RANGE_SCALE[range.id];
    if (!scale) continue;
    const spine = resample(range.points, scale.step);
    spine.forEach((point, index) => {
      const before = spine[Math.max(0, index - 1)]!;
      const after = spine[Math.min(spine.length - 1, index + 1)]!;
      const tx = after.x - before.x;
      const ty = after.y - before.y;
      const length = Math.hypot(tx, ty) || 1;
      const nx = -ty / length;
      const ny = tx / length;
      // Ranges thin at their ends; the shoulders stand tallest.
      const taper = Math.min(1, 0.45 + (Math.min(index, spine.length - 1 - index) / spine.length) * 5);
      for (let row = 0; row < scale.rows; row += 1) {
        const across = (row - (scale.rows - 1) / 2) * scale.spread + (rng() - 0.5) * scale.spread * 0.7;
        const x = point.x + nx * across + (rng() - 0.5) * 5;
        const y = point.y + ny * across + (rng() - 0.5) * 5;
        const height = scale.height * taper * (0.62 + rng() * 0.55) * (row === 1 ? 1.14 : 1);
        const half = height * (0.46 + rng() * 0.2);
        const lean = (rng() - 0.5) * half * 0.5;
        const peak = { x: x + lean, y: y - height };
        const westFoot = { x: x - half, y };
        const eastFoot = { x: x + half, y: y + (rng() - 0.5) * 2 };
        const shoulder = { x: x + half * (0.3 + rng() * 0.3) + lean * 0.5, y: y - height * (0.3 + rng() * 0.26) };
        const band = bands.get(Math.floor(y / 14)) ?? { masses: [], ridges: [], hatching: [] };
        band.masses.push(closed([westFoot, peak, shoulder, eastFoot]));
        band.ridges.push(line([westFoot, peak, shoulder, eastFoot]));
        const strokes = 2 + Math.floor(height / 9);
        for (let stroke = 1; stroke <= strokes; stroke += 1) {
          const t = stroke / (strokes + 1);
          const top = { x: peak.x + (eastFoot.x - peak.x) * t, y: peak.y + (eastFoot.y - peak.y) * t };
          const fall = height * (0.3 + 0.32 * (1 - t));
          band.hatching.push(line([top, { x: top.x - fall * 0.34, y: top.y + fall }]));
        }
        bands.set(Math.floor(y / 14), band);
      }
    });
  }
  return [...bands.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, band]) => ({
      id,
      masses: band.masses.join(""),
      ridges: band.ridges.join(""),
      hatching: band.hatching.join(""),
    }));
}

/** A closed wobbling outline about a centre. Harmonics are whole, so it meets itself. */
export function blob(
  centre: MapPoint,
  rx: number,
  ry: number,
  grow: number,
  seed: number,
  roughness = 0.14,
): MapPoint[] {
  const rng = createRng(seed);
  const waves = [2, 3, 5, 7, 11].map((harmonic, i) => ({
    harmonic,
    phase: rng() * Math.PI * 2,
    weight: (roughness / (i + 1)) * (0.6 + rng() * 0.6),
  }));
  const steps = 96;
  return Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    const swell = 1 + waves.reduce((sum, w) => sum + Math.sin(angle * w.harmonic + w.phase) * w.weight, 0);
    return {
      x: centre.x + Math.cos(angle) * (rx * swell + grow),
      y: centre.y + Math.sin(angle) * (ry * swell + grow),
    };
  });
}

const NURNEN_CENTRE = { x: 655, y: 722 };
const NURNEN_RX = 118;
const NURNEN_RY = 74;

export function nurnenOutline(grow = 0): MapPoint[] {
  return blob(NURNEN_CENTRE, NURNEN_RX, NURNEN_RY, grow, SEED + 7);
}

/** The land inside its walls, for the ground raster. */
export function landOutline(): MapPoint[] {
  const west = ranges.find((range) => range.id === "ephel-duath")!.points;
  const north = ranges.find((range) => range.id === "ered-lithui")!.points;
  return [...west, { x: 1010, y: 720 }, { x: 1010, y: 150 }, ...[...north].reverse()];
}

export function rangePolylines(): MapPoint[][] {
  return ranges.map((range) => resample(range.points, 18));
}

export interface SurveyLines {
  peaks: PeakBand[];
  coast: string;
  /** Hand-drawn water-lining: successive coasts offshore, then inland. */
  waterlines: string[];
  rivers: string;
  roads: string;
  contours: string[];
  exclusion: string;
  fire: string;
  cone: string;
  coneHatching: string;
  pits: string;
}

export function buildSurvey(): SurveyLines {
  const rng = createRng(SEED + 1);
  const orodruin = placeAt("orodruin");
  const barad = placeAt("barad-dur");
  const isenmouthe = placeAt("isenmouthe");
  const morgul = placeAt("minas-morgul");
  const morannon = placeAt("morannon");
  const cirith = placeAt("cirith-ungol");

  const courses: MapPoint[][] = [
    [{ x: 262, y: 628 }, { x: 330, y: 655 }, { x: 420, y: 668 }, { x: 545, y: 700 }],
    [{ x: 470, y: 840 }, { x: 500, y: 790 }, { x: 560, y: 768 }, { x: 590, y: 762 }],
    [{ x: 690, y: 862 }, { x: 680, y: 830 }, { x: 665, y: 800 }],
    [{ x: 900, y: 790 }, { x: 840, y: 765 }, { x: 772, y: 735 }],
  ];
  const highways: MapPoint[][] = [
    [isenmouthe, { x: 400, y: 245 }, { x: 480, y: 222 }, barad],
    [barad, { x: 500, y: 270 }, { x: 452, y: 310 }, { x: orodruin.x + 12, y: orodruin.y - 8 }],
    [morannon, { x: 240, y: 232 }, isenmouthe],
    [isenmouthe, { x: 232, y: 340 }, { x: 222, y: 440 }, { x: 214, y: 500 }, cirith],
    [{ x: 214, y: 500 }, { x: 214, y: 586 }, { x: 330, y: 640 }, { x: 470, y: 690 }],
    [morgul, cirith],
  ];

  const contours: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    contours.push(closed(blob(orodruin, 20, 15, i * 10.5, SEED + 20 + i, 0.12)));
  }
  for (let i = 0; i < 4; i += 1) {
    contours.push(closed(blob({ x: barad.x, y: barad.y - 28 }, 34, 26, i * 12, SEED + 40 + i, 0.16)));
  }

  const coneFeet = { west: { x: orodruin.x - 24, y: orodruin.y + 12 }, east: { x: orodruin.x + 25, y: orodruin.y + 13 } };
  const lip = { west: { x: orodruin.x - 5, y: orodruin.y - 19 }, east: { x: orodruin.x + 5, y: orodruin.y - 18 } };
  const coneHatching: string[] = [];
  for (let i = 1; i <= 7; i += 1) {
    const t = i / 8;
    const x = lip.east.x + (coneFeet.east.x - lip.east.x) * t;
    const y = lip.east.y + (coneFeet.east.y - lip.east.y) * t;
    coneHatching.push(line([{ x, y }, { x: x - 6 - t * 3, y: y + 15 * (1 - t * 0.7) }]));
  }

  const fire = [
    [{ x: orodruin.x - 2, y: orodruin.y - 16 }, { x: orodruin.x - 9, y: orodruin.y + 4 }, { x: orodruin.x - 26, y: orodruin.y + 40 }, { x: orodruin.x - 22, y: orodruin.y + 78 }],
    [{ x: orodruin.x + 3, y: orodruin.y - 16 }, { x: orodruin.x + 8, y: orodruin.y + 8 }, { x: orodruin.x + 24, y: orodruin.y + 34 }, { x: orodruin.x + 54, y: orodruin.y + 58 }],
  ]
    .map((course) => line(roughen(course, 5, rng)))
    .join("");

  let pits = "";
  let count = 0;
  while (count < 130) {
    const angle = rng() * Math.PI * 2;
    const reach = Math.sqrt(rng());
    const x = 470 + Math.cos(angle) * reach * 170;
    const y = 450 + Math.sin(angle) * reach * 105;
    if (Math.hypot(x - orodruin.x, y - orodruin.y) < 64) continue;
    const r = 1.6 + rng() * rng() * 7;
    pits += `M${fixed(x - r)} ${fixed(y)}a${fixed(r)} ${fixed(r * 0.55)} 0 0 1 ${fixed(r * 2)} 0`;
    count += 1;
  }

  return {
    peaks: buildPeaks(),
    coast: closed(nurnenOutline()),
    waterlines: [3, 7, 12, 18].map((inset) => closed(nurnenOutline(-inset))),
    rivers: courses.map((course) => line(roughen(course, 5, rng))).join(""),
    roads: highways.map((course) => line(roughen(course, 2, rng))).join(""),
    contours,
    exclusion: closed(blob(barad, 58, 58, 0, SEED + 60, 0)),
    fire,
    cone: closed([coneFeet.west, lip.west, { x: orodruin.x, y: orodruin.y - 14 }, lip.east, coneFeet.east]),
    coneHatching: coneHatching.join(""),
    pits,
  };
}
