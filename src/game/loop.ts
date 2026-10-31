// requestAnimationFrame accumulator: fixed sim steps, capped catch-up, and nothing runs while stopped.

export interface LoopHost {
  requestFrame(callback: (now: number) => void): number;
  cancelFrame(handle: number): void;
}

export interface LoopOptions {
  dt: number;
  /** Most sim steps in one frame. A long stall is dropped, never replayed. */
  maxSteps: number;
  /** Return false to stop the loop. */
  onStep(): boolean;
  /** `alpha` is how far the display sits between the last two steps, 0-1. */
  onFrame(alpha: number, elapsedSeconds: number): void;
  host?: LoopHost;
}

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

const browserHost: LoopHost = {
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (handle) => window.cancelAnimationFrame(handle),
};

export function createLoop(options: LoopOptions): Loop {
  const { dt, maxSteps, onStep, onFrame, host = browserHost } = options;
  let handle: number | null = null;
  let last: number | null = null;
  let accumulator = 0;

  function frame(now: number): void {
    handle = null;
    const elapsed = last === null ? dt : Math.max(0, (now - last) / 1000);
    last = now;
    accumulator = Math.min(accumulator + elapsed, dt * maxSteps);
    let alive = true;
    // Count once, up front: repeated float subtraction can lose the last step of a capped frame.
    const due = Math.floor(accumulator / dt + 1e-9);
    for (let done = 0; done < due && alive; done += 1) alive = onStep();
    accumulator = Math.max(0, accumulator - due * dt);
    onFrame(accumulator / dt, elapsed);
    // onStep may have stopped us through stop(), which leaves `running` false.
    if (alive && running) handle = host.requestFrame(frame);
    else running = false;
  }

  let running = false;
  return {
    start() {
      if (running) return;
      running = true;
      last = null;
      accumulator = 0;
      handle = host.requestFrame(frame);
    },
    stop() {
      running = false;
      if (handle !== null) host.cancelFrame(handle);
      handle = null;
    },
    get running() {
      return running;
    },
  };
}
