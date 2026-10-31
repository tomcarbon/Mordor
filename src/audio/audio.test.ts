import { afterEach, describe, expect, it, vi } from "vitest";

function fakeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

function fakeNode() {
  return {
    connect: vi.fn((next: unknown) => next),
    start: vi.fn(),
    stop: vi.fn(),
    gain: fakeParam(),
    frequency: fakeParam(),
    detune: fakeParam(),
    Q: fakeParam(),
    type: "",
    buffer: null,
    loop: false,
  };
}

function installFakeContext() {
  const created = vi.fn();
  class FakeContext {
    sampleRate = 100;
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => undefined);
    suspend = vi.fn(async () => undefined);
    constructor() {
      created();
    }
    createGain = fakeNode;
    createBiquadFilter = fakeNode;
    createOscillator = fakeNode;
    createBufferSource = fakeNode;
    createBuffer = () => ({ getChannelData: () => new Float32Array(500) });
  }
  vi.stubGlobal("AudioContext", FakeContext);
  return created;
}

describe("audio", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("creates no AudioContext until the visitor opts in", async () => {
    const created = installFakeContext();
    const audio = await import("./index");
    audio.setWraith(true);
    audio.setTension(0.5);
    audio.cue("stamp");
    audio.disableAudio();
    expect(created).not.toHaveBeenCalled();
    audio.enableAudio();
    audio.enableAudio();
    expect(created).toHaveBeenCalledTimes(1);
  });

  it("does nothing where WebAudio is missing", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const audio = await import("./index");
    expect(() => {
      audio.enableAudio();
      audio.cue("found");
      audio.disableAudio();
    }).not.toThrow();
  });
});
