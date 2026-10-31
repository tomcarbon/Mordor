import { useEffect, useRef } from "react";
import { createEyeRenderer } from "../../gl/eye-renderer";
import { useSiteStore } from "../../state/context";
import styles from "./threshold.module.css";

const MAX_PIXEL_RATIO = 1.5;
const MIN_QUALITY = 0.4;
const SLOW_FRAME_MS = 34;
const AWFUL_FRAME_MS = 120;
const IDLE_MS = 5000;
const RING_SECONDS = 0.9;

/** Runs the shader while on screen. `onFail` swaps in the static Eye. */
export function EyeCanvas({ onFail }: { onFail(): void }): React.JSX.Element {
  const store = useSiteStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const renderer = createEyeRenderer(canvas);
    if (!renderer) {
      onFail();
      return undefined;
    }

    let frame = 0;
    let last = 0;
    let time = 40;
    let onScreen = true;
    let quality = 1;
    let slowFrames = 0;
    let pointerAt = -Infinity;
    const target = { x: 0, y: 0 };
    const gaze = { x: 0, y: 0, vx: 0, vy: 0 };
    let ring = store.getSnapshot().ring ? 1 : 0;
    let attention = store.getSnapshot().attention / 100;

    function fit(): void {
      const box = canvas!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * quality;
      renderer!.resize(box.width, box.height, ratio);
    }

    function advance(dt: number, now: number): void {
      const state = store.getSnapshot();
      attention += (state.attention / 100 - attention) * Math.min(1, dt * 1.2);
      const towards = state.ring ? 1 : 0;
      ring += Math.sign(towards - ring) * Math.min(Math.abs(towards - ring), dt / RING_SECONDS);

      if (now - pointerAt > IDLE_MS) {
        target.x = Math.sin(time * 0.17) * 0.55;
        target.y = Math.sin(time * 0.11 + 1.3) * 0.3;
      }
      // Critically damped spring: heavy to start, heavy to stop, no overshoot. Stiffens as it notices you.
      const stiffness = 5 + 14 * attention;
      const damping = 2 * Math.sqrt(stiffness);
      gaze.vx += ((target.x - gaze.x) * stiffness - gaze.vx * damping) * dt;
      gaze.vy += ((target.y - gaze.y) * stiffness - gaze.vy * damping) * dt;
      gaze.x += gaze.vx * dt;
      gaze.y += gaze.vy * dt;
    }

    function governQuality(ms: number): void {
      if (ms > AWFUL_FRAME_MS) slowFrames += 10;
      else slowFrames = ms > SLOW_FRAME_MS ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 30 && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality * 0.7);
        slowFrames = 0;
        fit();
      }
    }

    function tick(now: number): void {
      frame = requestAnimationFrame(tick);
      const ms = last ? now - last : 16;
      last = now;
      const dt = Math.min(ms / 1000, 0.05);
      time += dt;
      advance(dt, now);
      governQuality(ms);
      renderer!.draw({ time, gazeX: gaze.x, gazeY: gaze.y, attention, ring });
    }

    function start(): void {
      if (frame || !onScreen || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    function stop(): void {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function onVisibility(): void {
      if (document.hidden) stop();
      else start();
    }

    function onPointer(event: PointerEvent): void {
      const box = canvas!.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, 1 - ((event.clientY - box.top) / box.height) * 2));
      pointerAt = performance.now();
    }

    function onContextLost(event: Event): void {
      event.preventDefault();
      stop();
      onFail();
    }

    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    resizeObserver?.observe(canvas);
    const visibility =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? true;
            if (onScreen) start();
            else stop();
          })
        : null;
    visibility?.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointer, { passive: true });
    canvas.addEventListener("webglcontextlost", onContextLost);

    fit();
    start();

    return () => {
      stop();
      resizeObserver?.disconnect();
      visibility?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      renderer.dispose();
    };
  }, [onFail, store]);

  return <canvas ref={canvasRef} className={styles.eye} aria-hidden="true" />;
}
