import { describe, expect, it } from "vitest";
import { createFlashLimiter, FLASH_MIN_PERIOD } from "./flash";
import { dangerLevel } from "./index";
import { mix, parseColor } from "./palette";

describe("flash limiter", () => {
  it("never allows more than three pulses in any second", () => {
    const limiter = createFlashLimiter();
    const fired: number[] = [];
    for (let t = 0; t < 10; t += 1 / 60) if (limiter.allow(t)) fired.push(t);
    expect(fired.length).toBeGreaterThan(0);
    for (const start of fired) expect(fired.filter((t) => t >= start && t < start + 1).length).toBeLessThanOrEqual(3);
    expect(FLASH_MIN_PERIOD).toBeGreaterThanOrEqual(1 / 3);
  });
});

describe("danger vignette", () => {
  it("drops the decorative sting with reduced motion, and keeps exposure, which is information", () => {
    expect(dangerLevel(0, 1, false)).toBeGreaterThan(0);
    expect(dangerLevel(0, 1, true)).toBe(0);
    expect(dangerLevel(0.6, 1, true)).toBe(dangerLevel(0.6, 0, false));
  });
});

describe("palette", () => {
  it("reads the colour forms a computed token can take", () => {
    expect(parseColor(" #0e0c0b")).toEqual([14, 12, 11]);
    expect(parseColor("rgb(30, 36, 40)")).toEqual([30, 36, 40]);
    expect(parseColor("rgb(30 36 40)")).toEqual([30, 36, 40]);
    expect(parseColor("nonsense")).toEqual([0, 0, 0]);
    expect(mix([0, 0, 0], [10, 20, 30], 0.5)).toEqual([5, 10, 15]);
  });
});
