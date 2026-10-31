// On-screen stick. A light push sneaks, a full push walks: there is no thumb free for a Sneak key.
import type { HeldInput } from "./keyboard";

export const STICK_SNEAK = 0.62;

export interface Stick {
  read(): HeldInput;
  clear(): void;
  destroy(): void;
}

/** Pure, so the dead zone and sneak band can be tested without a pointer. */
export function stickVector(dx: number, dy: number, radius: number): HeldInput {
  const length = Math.hypot(dx, dy) / radius;
  if (length < 0.14) return { moveX: 0, moveY: 0, sneak: false };
  // Full speed inside each band: the band, not the thumb, sets the pace.
  const unit = Math.hypot(dx, dy);
  return { moveX: dx / unit, moveY: dy / unit, sneak: length < STICK_SNEAK };
}

export function createStick(base: HTMLElement, knob: HTMLElement): Stick {
  let pointer: number | null = null;
  let vector: HeldInput = { moveX: 0, moveY: 0, sneak: false };

  function track(event: PointerEvent): void {
    const box = base.getBoundingClientRect();
    const radius = box.width / 2;
    const dx = event.clientX - (box.left + radius);
    const dy = event.clientY - (box.top + radius);
    vector = stickVector(dx, dy, radius);
    const length = Math.hypot(dx, dy);
    const clamp = length > radius ? radius / length : 1;
    knob.style.transform = `translate(${dx * clamp}px, ${dy * clamp}px)`;
  }

  function release(): void {
    pointer = null;
    vector = { moveX: 0, moveY: 0, sneak: false };
    knob.style.transform = "";
  }

  function down(event: PointerEvent): void {
    if (pointer !== null) return;
    pointer = event.pointerId;
    base.setPointerCapture?.(event.pointerId);
    track(event);
    event.preventDefault();
  }

  function move(event: PointerEvent): void {
    if (event.pointerId === pointer) track(event);
  }

  function up(event: PointerEvent): void {
    if (event.pointerId === pointer) release();
  }

  base.addEventListener("pointerdown", down);
  base.addEventListener("pointermove", move);
  base.addEventListener("pointerup", up);
  base.addEventListener("pointercancel", up);

  return {
    read: () => vector,
    clear: release,
    destroy() {
      base.removeEventListener("pointerdown", down);
      base.removeEventListener("pointermove", move);
      base.removeEventListener("pointerup", up);
      base.removeEventListener("pointercancel", up);
    },
  };
}
