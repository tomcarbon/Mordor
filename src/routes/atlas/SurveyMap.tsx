import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { atlasCopy, places, ranges } from "../../content/atlas";
import type { Place } from "../../content/atlas";
import { paintGround } from "./ground";
import { Survey } from "./Survey";
import {
  FIT_VIEW,
  FOCUS_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  centreOn,
  clampView,
  columnLabel,
  gridRef,
  nearestPlace,
  placeInDirection,
  placeLabels,
  project,
  reveal,
  scaleOf,
  zoomAt,
} from "./view";
import type { Direction, LabelRequest, View } from "./view";
import styles from "./atlas.module.css";

const DRAG_THRESHOLD = 5;
const TAP_REACH = 34;
const GLIDE_MS = 520;
const PAN_STEP = 72;
const ZOOM_STEP = 1.5;
const MARKER_CLEARANCE = 48;

const RANGE_LABELS = [
  { id: "ephel-south", name: ranges[0]!.name, x: 560, y: 930 },
  { id: "lithui", name: ranges[1]!.name, x: 640, y: 60 },
];

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function easeMass(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function dangerWord(place: Place): string {
  return atlasCopy.dangerScale[place.danger - 1] ?? "";
}

export interface SurveyMapProps {
  selected: Place | null;
  reduced: boolean;
  onSelect(place: Place): void;
}

/** Stage: raster and linework under one CSS transform; markers kept at reading size above them. */
export function SurveyMap({ selected, reduced, onSelect }: SurveyMapProps): React.JSX.Element {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(800);
  const sizeRef = useRef(size);
  const [view, setViewState] = useState<View>(FIT_VIEW);
  const viewRef = useRef(view);
  const glide = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; distance: number; k: number } | null>(null);
  const swallowClick = useRef(false);
  const settled = useRef(false);

  const setView = useCallback((next: View) => {
    const clamped = clampView(next, sizeRef.current);
    viewRef.current = clamped;
    setViewState(clamped);
  }, []);

  const stopGlide = useCallback(() => {
    cancelAnimationFrame(glide.current);
    glide.current = 0;
  }, []);

  const glideTo = useCallback(
    (target: View) => {
      stopGlide();
      if (reduced) {
        setView(target);
        return;
      }
      const from = viewRef.current;
      const started = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - started) / GLIDE_MS);
        const eased = easeMass(t);
        setView({
          k: from.k + (target.k - from.k) * eased,
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
        });
        glide.current = t < 1 ? requestAnimationFrame(frame) : 0;
      };
      glide.current = requestAnimationFrame(frame);
    },
    [reduced, setView, stopGlide],
  );

  useEffect(() => stopGlide, [stopGlide]);

  useEffect(() => {
    if (!canvas.current) return undefined;
    const orodruin = places.find((place) => place.id === "orodruin")!;
    const barad = places.find((place) => place.id === "barad-dur")!;
    return paintGround(canvas.current, [
      { x: orodruin.x, y: orodruin.y + 18, radius: 46, strength: 0.4 },
      { x: orodruin.x - 8, y: orodruin.y + 60, radius: 20, strength: 0.2 },
      { x: barad.x, y: barad.y + 10, radius: 28, strength: 0.28 },
    ]);
  }, []);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return undefined;
    const measure = () => {
      const width = element.clientWidth;
      if (!width || width === sizeRef.current) return;
      const ratio = width / sizeRef.current;
      sizeRef.current = width;
      setSize(width);
      const current = viewRef.current;
      setView({ k: current.k, x: current.x * ratio, y: current.y * ratio });
    };
    measure();
    if (typeof ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [setView]);

  // A selection from anywhere (marker, gazetteer, URL) brings the place to the centre of the sheet.
  useEffect(() => {
    const first = !settled.current;
    settled.current = true;
    if (!selected) return;
    const target = centreOn(selected, Math.max(viewRef.current.k, FOCUS_ZOOM), sizeRef.current);
    if (first) setView(target);
    else glideTo(target);
  }, [selected, glideTo, setView]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return undefined;
    function onWheel(event: WheelEvent): void {
      const box = element!.getBoundingClientRect();
      const current = viewRef.current;
      const next = zoomAt(
        current,
        current.k * Math.exp(-event.deltaY * 0.0018),
        event.clientX - box.left,
        event.clientY - box.top,
        sizeRef.current,
      );
      // At either limit the wheel goes back to the page, so the map cannot trap a scrolling reader.
      if (next.k === current.k) return;
      event.preventDefault();
      stopGlide();
      setView(next);
    }
    function onTouchStart(event: TouchEvent): void {
      // `pan-y` lets one finger scroll the page past an unzoomed map; two fingers belong to the map.
      if (event.touches.length > 1) event.preventDefault();
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
    };
  }, [setView, stopGlide]);

  function pinchDistance(): number {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = { moved: pointers.current.size > 1, distance: pinchDistance(), k: viewRef.current.k };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const last = pointers.current.get(event.pointerId);
    const active = gesture.current;
    if (!last || !active) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    const box = stage.current!.getBoundingClientRect();

    if (pointers.current.size > 1) {
      const midBefore = [...pointers.current.values()];
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const midAfter = [...pointers.current.values()];
      const mid = (list: { x: number; y: number }[]) => ({
        x: list.reduce((sum, p) => sum + p.x, 0) / list.length,
        y: list.reduce((sum, p) => sum + p.y, 0) / list.length,
      });
      const before = mid(midBefore);
      const after = mid(midAfter);
      stopGlide();
      const current = viewRef.current;
      const zoomed = active.distance
        ? zoomAt(current, active.k * (pinchDistance() / active.distance), after.x - box.left, after.y - box.top, sizeRef.current)
        : current;
      setView({ ...zoomed, x: zoomed.x + after.x - before.x, y: zoomed.y + after.y - before.y });
      return;
    }

    if (!active.moved) {
      const start = Math.hypot(dx, dy);
      if (start < DRAG_THRESHOLD) return;
      active.moved = true;
      stage.current!.setPointerCapture(event.pointerId);
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stopGlide();
    const current = viewRef.current;
    setView({ ...current, x: current.x + dx, y: current.y + dy });
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>): void {
    if (!pointers.current.delete(event.pointerId)) return;
    if (gesture.current?.moved) swallowClick.current = true;
    if (pointers.current.size === 1) {
      gesture.current = { moved: true, distance: 0, k: viewRef.current.k };
    } else if (pointers.current.size === 0) {
      gesture.current = null;
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 0);
    }
  }

  function onClick(event: MouseEvent<HTMLDivElement>): void {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-place]");
    const own = places.find((place) => place.id === button?.dataset.place) ?? null;
    // detail 0 is the keyboard or assistive tech: take the element at its word. A pointer may land
    // in a crowded corner of the sheet, so it gets the marker nearest the touch.
    if (event.detail === 0) {
      if (own) onSelect(own);
      return;
    }
    const box = stage.current!.getBoundingClientRect();
    const hit = nearestPlace(
      places,
      event.clientX - box.left,
      event.clientY - box.top,
      viewRef.current,
      sizeRef.current,
      TAP_REACH,
    );
    const place = hit ?? own;
    if (place) onSelect(place);
  }

  function zoomBy(factor: number): void {
    const middle = sizeRef.current / 2;
    glideTo(zoomAt(viewRef.current, viewRef.current.k * factor, middle, middle, sizeRef.current));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const direction = ARROWS[event.key];
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-place]");
    const from = places.find((place) => place.id === button?.dataset.place);
    if (direction && from) {
      event.preventDefault();
      const next = placeInDirection(places, from, direction);
      if (next) stage.current?.querySelector<HTMLElement>(`[data-place="${next.id}"]`)?.focus();
      return;
    }
    if (direction) {
      event.preventDefault();
      const current = viewRef.current;
      const x = direction === "left" ? PAN_STEP : direction === "right" ? -PAN_STEP : 0;
      const y = direction === "up" ? PAN_STEP : direction === "down" ? -PAN_STEP : 0;
      stopGlide();
      setView({ ...current, x: current.x + x, y: current.y + y });
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      zoomBy(1 / ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      glideTo(FIT_VIEW);
    }
  }

  const scale = scaleOf(view, size);
  const stageLeft = (point: { x: number; y: number }) => project(point, view, size);

  const labels = useMemo(() => {
    const requests: LabelRequest[] = [
      ...places.map((place) => ({
        id: place.id,
        text: place.name,
        at: project(place, view, size),
        priority: 6 - place.danger,
        offset: 14,
      })),
      ...RANGE_LABELS.map((range) => ({
        id: range.id,
        text: range.name,
        at: project(range, view, size),
        priority: 9,
        offset: 0,
      })),
    ];
    return new Map(placeLabels(requests, size, selected?.id ?? null).map((label) => [label.id, label.side]));
  }, [view, size, selected]);

  const selectedAt = selected ? stageLeft(selected) : null;
  const columns = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className={styles.sheet}>
      <div
        ref={stage}
        className={styles.stage}
        role="group"
        tabIndex={0}
        aria-label={`${atlasCopy.title}. ${atlasCopy.instructions}`}
        data-testid="survey-stage"
        data-zoom={view.k.toFixed(2)}
        style={{ touchAction: view.k > MIN_ZOOM + 0.01 ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <div
          className={styles.plate}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          <canvas ref={canvas} className={styles.ground} aria-hidden="true" />
          <Survey />
        </div>

        {selectedAt ? (
          <div className={styles.crosshair} aria-hidden="true">
            <i style={{ transform: `translateX(${selectedAt.x}px)` }} />
            <i style={{ transform: `translateY(${selectedAt.y}px)` }} />
          </div>
        ) : null}

        <div className={styles.gridTop} aria-hidden="true">
          {columns.map((i) => (
            <span key={i} style={{ transform: `translateX(${view.x + (i + 0.5) * 100 * scale}px)` }}>
              {columnLabel(i)}
            </span>
          ))}
        </div>
        <div className={styles.gridSide} aria-hidden="true">
          {columns.map((i) => (
            <span key={i} style={{ transform: `translateY(${view.y + (i + 0.5) * 100 * scale}px)` }}>
              {i + 1}
            </span>
          ))}
        </div>

        {RANGE_LABELS.filter((range) => labels.has(range.id)).map((range) => {
          const at = stageLeft(range);
          return (
            <span
              key={range.id}
              className={styles.rangeLabel}
              aria-hidden="true"
              style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
            >
              {range.name}
            </span>
          );
        })}

        {places.map((place) => {
          const at = stageLeft(place);
          const side = labels.get(place.id);
          return (
            <button
              key={place.id}
              type="button"
              data-place={place.id}
              className={styles.marker}
              data-danger={place.danger}
              data-selected={place.id === selected?.id || undefined}
              aria-pressed={place.id === selected?.id}
              aria-label={`${place.name}, ${place.kind}. ${atlasCopy.dangerLabel} ${place.danger} of 5: ${dangerWord(place)}. Grid ${gridRef(place)}`}
              style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
              onFocus={() => {
                const next = reveal(place, viewRef.current, sizeRef.current, MARKER_CLEARANCE);
                if (next.x !== viewRef.current.x || next.y !== viewRef.current.y) glideTo(next);
              }}
            >
              <i className={styles.pip} />
              {side ? (
                <span className={styles.label} data-side={side}>
                  {place.name}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={styles.controls}>
        <p className={styles.instructions}>{atlasCopy.instructions}</p>
        <p className={styles.readout} aria-hidden="true">
          {`×${view.k.toFixed(1)}`}
        </p>
        <div className={styles.zoom}>
          <button type="button" aria-label={atlasCopy.zoomInLabel} title={atlasCopy.zoomInLabel} disabled={view.k >= MAX_ZOOM} onClick={() => zoomBy(ZOOM_STEP)}>
            +
          </button>
          <button type="button" aria-label={atlasCopy.zoomOutLabel} title={atlasCopy.zoomOutLabel} disabled={view.k <= MIN_ZOOM} onClick={() => zoomBy(1 / ZOOM_STEP)}>
            {"−"}
          </button>
          <button type="button" className={styles.restore} onClick={() => glideTo(FIT_VIEW)}>
            {atlasCopy.resetLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

