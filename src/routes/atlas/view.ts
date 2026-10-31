// The survey's arithmetic: view transforms, grid references, label placement, marker picking.
// Pure, so it is tested without a browser. A view maps sheet units (0-1000) to stage pixels.
import type { MapPoint, Place } from "../../content/atlas";

export const SHEET = 1000;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
/** The closest a dossier pulls the survey in by itself. */
export const FOCUS_ZOOM = 2.4;

export interface View {
  k: number;
  x: number;
  y: number;
}

export const FIT_VIEW: View = { k: 1, x: 0, y: 0 };

export function scaleOf(view: View, size: number): number {
  return (size / SHEET) * view.k;
}

export function project(point: MapPoint, view: View, size: number): MapPoint {
  const scale = scaleOf(view, size);
  return { x: view.x + point.x * scale, y: view.y + point.y * scale };
}

/** Keeps the sheet covering the stage: no edge of the survey is ever dragged into view. */
export function clampView(view: View, size: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.k));
  const span = size * k;
  return {
    k,
    x: Math.min(0, Math.max(size - span, view.x)),
    y: Math.min(0, Math.max(size - span, view.y)),
  };
}

/** Zooms about a stage point, which stays over the same ground. */
export function zoomAt(view: View, nextK: number, px: number, py: number, size: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextK));
  const ratio = k / view.k;
  return clampView({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, size);
}

export function centreOn(point: MapPoint, k: number, size: number): View {
  const scale = (size / SHEET) * k;
  return clampView({ k, x: size / 2 - point.x * scale, y: size / 2 - point.y * scale }, size);
}

/** Moves the least distance that brings a point inside the stage, `margin` pixels clear of it. */
export function reveal(point: MapPoint, view: View, size: number, margin: number): View {
  const at = project(point, view, size);
  const dx = at.x < margin ? margin - at.x : at.x > size - margin ? size - margin - at.x : 0;
  const dy = at.y < margin ? margin - at.y : at.y > size - margin ? size - margin - at.y : 0;
  return clampView({ ...view, x: view.x + dx, y: view.y + dy }, size);
}

const COLUMNS = "ABCDEFGHIJ";

/** Survey grid reference: column letter west to east, row number north to south. */
export function gridRef(point: MapPoint): string {
  const column = Math.min(9, Math.floor(point.x / 100));
  const row = Math.min(9, Math.floor(point.y / 100));
  return `${COLUMNS[column]}${row + 1}`;
}

export function columnLabel(index: number): string {
  return COLUMNS[index] ?? "";
}

/** The marker nearest a stage point, if any lies within `reach` pixels. Resolves crowded taps. */
export function nearestPlace(
  places: Place[],
  px: number,
  py: number,
  view: View,
  size: number,
  reach: number,
): Place | null {
  let best: Place | null = null;
  let bestDistance = reach;
  for (const place of places) {
    const at = project(place, view, size);
    const distance = Math.hypot(at.x - px, at.y - py);
    if (distance <= bestDistance) {
      best = place;
      bestDistance = distance;
    }
  }
  return best;
}

export type Direction = "up" | "down" | "left" | "right";

const VECTORS: Record<Direction, MapPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Spatial keyboard travel: the nearest place within a quarter-turn of the arrow pressed. */
export function placeInDirection(places: Place[], from: Place, direction: Direction): Place | null {
  const vector = VECTORS[direction];
  let best: Place | null = null;
  let bestCost = Infinity;
  for (const place of places) {
    if (place.id === from.id) continue;
    const dx = place.x - from.x;
    const dy = place.y - from.y;
    const along = dx * vector.x + dy * vector.y;
    const across = Math.abs(dx * vector.y) + Math.abs(dy * vector.x);
    if (along <= 0 || across > along) continue;
    const cost = along + across * 2;
    if (cost < bestCost) {
      best = place;
      bestCost = cost;
    }
  }
  return best;
}

export interface LabelRequest {
  id: string;
  text: string;
  at: MapPoint;
  /** Lower goes first. */
  priority: number;
  /** Space kept clear on either side of the anchor. */
  offset: number;
}

export interface PlacedLabel {
  id: string;
  side: "left" | "right";
}

const CHAR_WIDTH = 8.8;
const LABEL_HEIGHT = 20;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Greedy map labelling: most important first; a label that cannot sit clear is left off. */
export function placeLabels(requests: LabelRequest[], size: number, keep: string | null): PlacedLabel[] {
  const ordered = [...requests].sort(
    (a, b) => Number(b.id === keep) - Number(a.id === keep) || a.priority - b.priority,
  );
  const taken: Box[] = [];
  const placed: PlacedLabel[] = [];
  for (const request of ordered) {
    const width = request.text.length * CHAR_WIDTH + 12;
    const { x, y } = request.at;
    if (x < 0 || x > size || y < 0 || y > size) continue;
    const sides: PlacedLabel["side"][] = x + request.offset + width > size ? ["left"] : ["right", "left"];
    for (const side of sides) {
      const left = side === "right" ? x + request.offset : x - request.offset - width;
      const box = { left, right: left + width, top: y - LABEL_HEIGHT / 2, bottom: y + LABEL_HEIGHT / 2 };
      if (left < 0 || taken.some((other) => overlaps(box, other))) continue;
      taken.push(box);
      placed.push({ id: request.id, side });
      break;
    }
  }
  return placed;
}
