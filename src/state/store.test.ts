// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSiteStore, RING_MULTIPLIER, STORAGE_KEY } from "./store";
import type { AttentionStorage } from "./store";

function memory(initial?: string): AttentionStorage & { data: Map<string, string> } {
  const data = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("site store", () => {
  it("starts at rest with ring and audio off", () => {
    expect(createSiteStore(null).getSnapshot()).toEqual({ attention: 0, ring: false, audio: false, ringLocked: false });
  });

  it("keeps the same snapshot until something changes", () => {
    const store = createSiteStore(null);
    const before = store.getSnapshot();
    store.setRing(false);
    store.raiseAttention(0);
    expect(store.getSnapshot()).toBe(before);
    store.raiseAttention(1);
    expect(store.getSnapshot()).not.toBe(before);
  });

  it("clamps attention to 100", () => {
    const store = createSiteStore(null);
    store.raiseAttention(99);
    store.raiseAttention(50);
    expect(store.getSnapshot().attention).toBe(100);
  });

  it("ignores raises at 100, and negative or NaN amounts", () => {
    const store = createSiteStore(null);
    const listener = vi.fn();
    store.raiseAttention(100);
    store.subscribe(listener);
    store.raiseAttention(1);
    expect(listener).not.toHaveBeenCalled();
    store.resetAttention();
    store.raiseAttention(-5);
    store.raiseAttention(Number.NaN);
    expect(store.getSnapshot().attention).toBe(0);
  });

  it("multiplies raises while the ring is on, and only then", () => {
    const store = createSiteStore(null);
    store.raiseAttention(1);
    store.setRing(true);
    store.raiseAttention(1);
    expect(store.getSnapshot().attention).toBe(1 + RING_MULTIPLIER);
    store.setRing(false);
    store.raiseAttention(1);
    expect(store.getSnapshot().attention).toBe(2 + RING_MULTIPLIER);
  });

  it("notifies subscribers until they unsubscribe", () => {
    const store = createSiteStore(null);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.setAudio(true);
    off();
    store.setAudio(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("persists attention and nothing else", () => {
    const storage = memory();
    const store = createSiteStore(storage);
    store.raiseAttention(12.5);
    store.setRing(true);
    store.setAudio(true);
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY]);
    const reloaded = createSiteStore(storage).getSnapshot();
    expect(reloaded).toEqual({ attention: 12.5, ring: false, audio: false, ringLocked: false });
  });

  it.each([
    ["junk", 0],
    ["-3", 0],
    ["450", 100],
    ["Infinity", 0],
  ])("sanitises a stored value of %s", (stored, expected) => {
    expect(createSiteStore(memory(stored)).getSnapshot().attention).toBe(expected);
  });

  it("survives storage that throws", () => {
    const hostile: AttentionStorage = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
    };
    const store = createSiteStore(hostile);
    store.raiseAttention(5);
    expect(store.getSnapshot().attention).toBe(5);
  });
});

describe("ring lock", () => {
  it("starts off, is not persisted, and does not itself move the Ring", () => {
    const setItem = vi.fn();
    const store = createSiteStore({ getItem: () => null, setItem });
    expect(store.getSnapshot().ringLocked).toBe(false);
    store.setRing(true);
    store.setRingLocked(true);
    expect(store.getSnapshot()).toMatchObject({ ring: true, ringLocked: true });
    expect(setItem).not.toHaveBeenCalled();
  });
});
