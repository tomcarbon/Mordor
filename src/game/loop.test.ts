import { describe, expect, it, vi } from "vitest";
import { createLoop } from "./loop";
import type { LoopHost } from "./loop";

function fakeHost(): LoopHost & { fire(now: number): void; pending(): number } {
  let next = 1;
  const frames = new Map<number, (now: number) => void>();
  return {
    requestFrame(callback) {
      frames.set(next, callback);
      return next++;
    },
    cancelFrame(handle) {
      frames.delete(handle);
    },
    fire(now) {
      const due = [...frames.values()];
      frames.clear();
      for (const callback of due) callback(now);
    },
    pending: () => frames.size,
  };
}

describe("loop", () => {
  it("runs fixed steps from elapsed time", () => {
    const host = fakeHost();
    const onStep = vi.fn(() => true);
    const loop = createLoop({ dt: 0.01, maxSteps: 100, onStep, onFrame: vi.fn(), host });
    loop.start();
    host.fire(1000);
    onStep.mockClear();
    host.fire(1050);
    expect(onStep.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(onStep.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("caps catch-up after a stall", () => {
    const host = fakeHost();
    const onStep = vi.fn(() => true);
    const loop = createLoop({ dt: 0.01, maxSteps: 5, onStep, onFrame: vi.fn(), host });
    loop.start();
    host.fire(0);
    onStep.mockClear();
    host.fire(60_000);
    expect(onStep).toHaveBeenCalledTimes(5);
  });

  it("schedules nothing once stopped, and no time passes while stopped", () => {
    const host = fakeHost();
    const onStep = vi.fn(() => true);
    const loop = createLoop({ dt: 0.01, maxSteps: 5, onStep, onFrame: vi.fn(), host });
    loop.start();
    host.fire(0);
    loop.stop();
    expect(host.pending()).toBe(0);
    expect(loop.running).toBe(false);
    onStep.mockClear();
    loop.start();
    host.fire(90_000);
    expect(onStep.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("stops when a step says so", () => {
    const host = fakeHost();
    const loop = createLoop({ dt: 0.01, maxSteps: 5, onStep: () => false, onFrame: vi.fn(), host });
    loop.start();
    host.fire(0);
    host.fire(100);
    expect(loop.running).toBe(false);
    expect(host.pending()).toBe(0);
  });
});
