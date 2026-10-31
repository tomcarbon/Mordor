import { describe, expect, it, vi } from "vitest";
import { createKeyboard } from "./keyboard";
import { stickVector, STICK_SNEAK } from "./stick";

function press(target: HTMLElement, code: string, type = "keydown", repeat = false): KeyboardEvent {
  const event = new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("keyboard", () => {
  it("maps WASD, arrows and Shift, and stops the page scrolling", () => {
    const target = document.createElement("canvas");
    const keys = createKeyboard(target, { onRing: vi.fn(), onPause: vi.fn() });
    expect(press(target, "ArrowDown").defaultPrevented).toBe(true);
    press(target, "KeyD");
    press(target, "ShiftLeft");
    expect(keys.read()).toEqual({ moveX: 1, moveY: 1, sneak: true });
    press(target, "ArrowDown", "keyup");
    press(target, "KeyA");
    expect(keys.read()).toEqual({ moveX: 0, moveY: 0, sneak: true });
    keys.destroy();
  });

  it("toggles the Ring once per press, and pauses on Escape", () => {
    const target = document.createElement("canvas");
    const onRing = vi.fn();
    const onPause = vi.fn();
    const keys = createKeyboard(target, { onRing, onPause });
    press(target, "Space");
    press(target, "Space", "keydown", true);
    press(target, "Escape");
    expect(onRing).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
    keys.destroy();
  });

  it("drops held keys on blur and leaves browser shortcuts alone", () => {
    const target = document.createElement("canvas");
    const keys = createKeyboard(target, { onRing: vi.fn(), onPause: vi.fn() });
    press(target, "KeyW");
    target.dispatchEvent(new FocusEvent("blur"));
    expect(keys.read().moveY).toBe(0);
    const chord = new KeyboardEvent("keydown", { code: "KeyS", ctrlKey: true, cancelable: true });
    target.dispatchEvent(chord);
    expect(chord.defaultPrevented).toBe(false);
    keys.destroy();
  });
});

describe("keyboard out of play", () => {
  it("ignores gameplay keys, still claims them from the page, and lets Escape through", () => {
    const target = document.createElement("canvas");
    const onRing = vi.fn();
    const onPause = vi.fn();
    let active = false;
    const keys = createKeyboard(target, { active: () => active, onRing, onPause });
    expect(press(target, "Space").defaultPrevented).toBe(true);
    press(target, "KeyD");
    press(target, "ShiftLeft");
    expect(onRing).not.toHaveBeenCalled();
    expect(keys.read()).toEqual({ moveX: 0, moveY: 0, sneak: false });
    press(target, "Escape");
    expect(onPause).toHaveBeenCalledTimes(1);
    active = true;
    press(target, "Space");
    expect(onRing).toHaveBeenCalledTimes(1);
    keys.destroy();
  });
});

describe("stick", () => {
  it("ignores a resting thumb, sneaks on a light push, walks on a full one", () => {
    expect(stickVector(2, 1, 60)).toEqual({ moveX: 0, moveY: 0, sneak: false });
    expect(stickVector(60 * (STICK_SNEAK - 0.1), 0, 60)).toEqual({ moveX: 1, moveY: 0, sneak: true });
    expect(stickVector(0, 200, 60)).toEqual({ moveX: 0, moveY: 1, sneak: false });
  });
});
