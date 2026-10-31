export type CueName = "stamp" | "detected" | "alarm" | "found";

const PEAK_GAIN = 0.125; // -18 dBFS
const DRONE_SHARE = 0.68; // the rest of the headroom belongs to cues
const FADE_SECONDS = 1.5;
const STAMP_GAP_SECONDS = 1;
const RING_DETUNE_CENTS = -30;
const RING_CUTOFF_HZ = 500;

type AudioContextClass = typeof AudioContext;

function contextClass(): AudioContextClass | null {
  const scope = window as Window & { webkitAudioContext?: AudioContextClass };
  return window.AudioContext ?? scope.webkitAudioContext ?? null;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise: wind, not hiss
    data[i] = last * 3.5;
  }
  return buffer;
}

export interface DroneEngine {
  fadeIn(): void;
  fadeOut(): void;
  setWraith(on: boolean): void;
  setTension(amount: number): void;
  cue(name: CueName): void;
}

export function createEngine(): DroneEngine | null {
  const Context = contextClass();
  if (!Context) return null;

  const ctx = new Context();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.Q.value = 0.8;
  body.frequency.value = 180;
  const droneGain = ctx.createGain();
  droneGain.gain.value = DRONE_SHARE;
  body.connect(droneGain).connect(master);

  const voices = [
    { frequency: 46.25, detune: -4, level: 0.34 },
    { frequency: 46.25, detune: 5, level: 0.34 },
    { frequency: 69.3, detune: 2, level: 0.12 },
  ].map(({ frequency, detune, level }) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = level;
    oscillator.connect(gain).connect(body);
    oscillator.start();
    return { oscillator, detune };
  });

  const wind = ctx.createBufferSource();
  wind.buffer = noiseBuffer(ctx);
  wind.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 340;
  windFilter.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.2;
  const gust = ctx.createOscillator();
  gust.frequency.value = 0.07;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = 150;
  gust.connect(gustDepth).connect(windFilter.frequency);
  gust.start();
  wind.connect(windFilter).connect(windGain).connect(body);
  wind.start();

  const partial = ctx.createOscillator();
  partial.frequency.value = 14200;
  const partialGain = ctx.createGain();
  partialGain.gain.value = 0;
  partial.connect(partialGain).connect(master);
  partial.start();

  let wraith = false;
  let tension = 0;
  let wanted = false;
  let stampReadyAt = 0;
  let suspendTimer: number | undefined;

  function applyTone(): void {
    const now = ctx.currentTime;
    const cutoff = wraith ? RING_CUTOFF_HZ : 180 + 520 * tension;
    body.frequency.setTargetAtTime(cutoff, now, 1.2);
    windGain.gain.setTargetAtTime(wraith ? 0.12 : 0.2, now, 1.2);
    partialGain.gain.setTargetAtTime(wraith ? 0.012 : 0, now, 1.2);
    for (const voice of voices) {
      voice.oscillator.detune.setTargetAtTime(
        voice.detune + (wraith ? RING_DETUNE_CENTS : 0),
        now,
        1.2,
      );
    }
  }

  function fade(to: number): void {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(to, now + FADE_SECONDS);
  }

  function onVisibility(): void {
    if (!wanted) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  }
  document.addEventListener("visibilitychange", onVisibility);

  function tone(frequency: number, seconds: number, level: number, attack = 0.01): void {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.6, now + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.05);
  }

  return {
    fadeIn() {
      wanted = true;
      window.clearTimeout(suspendTimer);
      void ctx.resume();
      fade(PEAK_GAIN);
    },
    fadeOut() {
      wanted = false;
      fade(0);
      suspendTimer = window.setTimeout(() => void ctx.suspend(), FADE_SECONDS * 1000 + 100);
    },
    setWraith(on) {
      wraith = on;
      applyTone();
    },
    setTension(amount) {
      tension = Math.min(1, Math.max(0, amount));
      applyTone();
    },
    cue(name) {
      const level = 1 - DRONE_SHARE;
      if (name === "stamp") {
        if (ctx.currentTime < stampReadyAt) return;
        stampReadyAt = ctx.currentTime + STAMP_GAP_SECONDS;
        tone(62, 0.28, level);
      } else if (name === "detected") {
        tone(92, 0.7, level * 0.8, 0.08);
      } else if (name === "alarm") {
        tone(78, 1.4, level, 0.3);
      } else {
        tone(41, 3, level, 0.8);
      }
    },
  };
}
