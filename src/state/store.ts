export interface SiteState {
  readonly attention: number; // 0-100
  readonly ring: boolean;
  readonly audio: boolean;
  /** Set while the game is paused: the visitor's own toggles leave the Ring alone. */
  readonly ringLocked: boolean;
}

export interface SiteStore {
  getSnapshot(): SiteState;
  subscribe(listener: () => void): () => void;
  raiseAttention(amount: number): void;
  resetAttention(): void;
  setRing(on: boolean): void;
  setRingLocked(locked: boolean): void;
  setAudio(on: boolean): void;
}

export type AttentionStorage = Pick<Storage, "getItem" | "setItem">;

export const STORAGE_KEY = "mordor.attention.v1";
export const RING_MULTIPLIER = 5;

function clampAttention(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function load(storage: AttentionStorage | null): number {
  try {
    const stored = Number.parseFloat(storage?.getItem(STORAGE_KEY) ?? "");
    return Number.isFinite(stored) ? clampAttention(stored) : 0;
  } catch {
    return 0;
  }
}

function defaultStorage(): AttentionStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createSiteStore(storage: AttentionStorage | null = defaultStorage()): SiteStore {
  const listeners = new Set<() => void>();
  let state: SiteState = { attention: load(storage), ring: false, audio: false, ringLocked: false };

  function commit(next: SiteState): void {
    const persist = next.attention !== state.attention;
    state = next;
    if (persist) {
      try {
        storage?.setItem(STORAGE_KEY, String(next.attention));
      } catch {
        // Storage may be full or denied; the meter still works for this visit.
      }
    }
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    raiseAttention(amount) {
      if (state.attention >= 100 || !(amount > 0)) return;
      const scaled = state.ring ? amount * RING_MULTIPLIER : amount;
      commit({ ...state, attention: clampAttention(state.attention + scaled) });
    },
    resetAttention() {
      if (state.attention !== 0) commit({ ...state, attention: 0 });
    },
    setRing(on) {
      if (state.ring !== on) commit({ ...state, ring: on });
    },
    setRingLocked(locked) {
      if (state.ringLocked !== locked) commit({ ...state, ringLocked: locked });
    },
    setAudio(on) {
      if (state.audio !== on) commit({ ...state, audio: on });
    },
  };
}
