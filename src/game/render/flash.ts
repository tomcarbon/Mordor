// WCAG 2.3.1 guard: full-field pulses may fire at most this often (2.5 per second).
export const FLASH_MIN_PERIOD = 0.4;

export interface FlashLimiter {
  /** True if a pulse may fire now; `now` is in seconds. Refused pulses are dropped, not queued. */
  allow(now: number): boolean;
}

export function createFlashLimiter(period = FLASH_MIN_PERIOD): FlashLimiter {
  let last = -Infinity;
  return {
    allow(now) {
      if (now - last < period) return false;
      last = now;
      return true;
    },
  };
}
