// Draws a World. Reads only: never mutates the World, and owns all flash and reduced-motion rules.
import { gazeOf, ROCK } from "../sim";
import type { Patrol, StageKey, World } from "../sim";
import { createFlashLimiter } from "./flash";
import { buildStageArt, GROUND_SCALE, SHADOW_SCALE } from "./ground";
import type { StageArt } from "./ground";
import { css, mix, readPalettes } from "./palette";
import type { Palette, Rgb } from "./palette";
import { tileAt } from "../sim/grid";
import { VISION_HALF, VISION_RANGE } from "../sim/tuning";

export interface Renderer {
  resize(): void;
  setReducedMotion(reduced: boolean): void;
  draw(previous: World | null, world: World, alpha: number, elapsed: number): void;
  destroy(): void;
}

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
}

const VIEW_TILES_WIDE = 18;
const VIEW_TILES_TALL = 21;
const RING_FADE_SECONDS = 0.9;
const BEAM_SCALE = 0.5;
const FOG_INNER = 7;
const FOG_OUTER = 15;
const FOG_DARK = 0.72;
const FOG_DARK_WORN = 0.5;
const MAX_DPR = 1.5;
const FLAKES = 70;
const STAMP_FONT = '600 15px "IBM Plex Mono", ui-monospace, monospace';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Exposure is information and stays; the sting is a decorative pulse and goes with reduced motion. */
export function dangerLevel(exposure: number, sting: number, reduced: boolean): number {
  return Math.max(exposure * 0.5, reduced ? 0 : sting * 0.28);
}

export function createRenderer(canvas: HTMLCanvasElement, host: HTMLElement): Renderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const context = ctx;
  const palettes = readPalettes(host);
  const beam = document.createElement("canvas");
  const beamContext = beam.getContext("2d");
  if (!beamContext) return null;
  const beamCtx = beamContext;

  const fogSprite = document.createElement("canvas");
  fogSprite.width = 96;
  fogSprite.height = 96;
  const fogCtx = fogSprite.getContext("2d");

  const limiter = createFlashLimiter();
  let art: StageArt | null = null;
  let artKey: StageKey | null = null;
  let artSeed = -1;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let reduced = false;
  let ringFade = 0;
  let clock = 0;
  let sting = 0;
  let shake = 0;
  const flakes: Flake[] = Array.from({ length: FLAKES }, () => ({
    x: Math.random(), y: Math.random(), size: 0.8 + Math.random() * 1.6, speed: 0.012 + Math.random() * 0.03,
  }));

  function resize(): void {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    width = Math.max(1, Math.round(box.width));
    height = Math.max(1, Math.round(box.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    beam.width = Math.ceil(width * BEAM_SCALE);
    beam.height = Math.ceil(height * BEAM_SCALE);
  }

  function ensureArt(world: World): StageArt {
    if (!art || artKey !== world.map.id || artSeed !== world.seed) {
      art = buildStageArt(world.map, palettes.normal, palettes.wraith);
      artKey = world.map.id;
      artSeed = world.seed;
    }
    return art;
  }

  /** The dark closes in around the bearer: a small sprite, stretched, so it costs one blit. */
  function drawFog(x: number, y: number, tile: number, color: Rgb): void {
    if (!fogCtx) return;
    const outer = tile * FOG_OUTER;
    const size = fogSprite.width;
    const middle = size / 2;
    const gradient = fogCtx.createRadialGradient(middle, middle, (middle * FOG_INNER) / FOG_OUTER, middle, middle, middle);
    const edge = lerp(FOG_DARK, FOG_DARK_WORN, ringFade);
    gradient.addColorStop(0, css(color, 0));
    gradient.addColorStop(1, css(color, edge));
    fogCtx.clearRect(0, 0, size, size);
    fogCtx.fillStyle = gradient;
    fogCtx.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.drawImage(fogSprite, x - outer, y - outer, outer * 2, outer * 2);
    context.fillStyle = css(color, edge);
    if (y - outer > 0) context.fillRect(0, 0, width, y - outer);
    if (y + outer < height) context.fillRect(0, y + outer, width, height - y - outer);
    if (x - outer > 0) context.fillRect(0, Math.max(0, y - outer), x - outer, outer * 2);
    if (x + outer < width) context.fillRect(x + outer, Math.max(0, y - outer), width - x - outer, outer * 2);
  }

  function drawBeam(world: World, stage: StageArt, cameraX: number, cameraY: number, tile: number, wraith: Palette): void {
    const { map, eye, player } = world;
    const ox = (map.origin.x - cameraX) * tile * BEAM_SCALE;
    const oy = (map.origin.y - cameraY) * tile * BEAM_SCALE;
    const length = 4000;
    const wedge = (half: number): void => {
      beamCtx.beginPath();
      beamCtx.moveTo(ox, oy);
      beamCtx.lineTo(ox + Math.cos(eye.angle - half) * length, oy + Math.sin(eye.angle - half) * length);
      beamCtx.lineTo(ox + Math.cos(eye.angle + half) * length, oy + Math.sin(eye.angle + half) * length);
      beamCtx.closePath();
    };
    beamCtx.clearRect(0, 0, beam.width, beam.height);
    beamCtx.globalCompositeOperation = "source-over";
    const heat = player.ringOn ? 0.36 : 0.27;
    if (!reduced) {
      beamCtx.fillStyle = css(wraith.eye, heat * 0.4);
      wedge(map.beamHalf * 1.14);
      beamCtx.fill();
    }
    beamCtx.fillStyle = css(wraith.eye, heat);
    wedge(map.beamHalf);
    beamCtx.fill();
    beamCtx.strokeStyle = css(wraith.eye, 0.9);
    beamCtx.lineWidth = 1.5;
    beamCtx.stroke();
    // Rock stops the gaze: cut the shadows out of the cone.
    beamCtx.globalCompositeOperation = "destination-out";
    beamCtx.imageSmoothingEnabled = true;
    const scale = (tile * BEAM_SCALE) / SHADOW_SCALE;
    beamCtx.drawImage(stage.shadow, -cameraX * tile * BEAM_SCALE, -cameraY * tile * BEAM_SCALE, stage.shadow.width * scale, stage.shadow.height * scale);
    beamCtx.globalCompositeOperation = "source-over";
    context.globalCompositeOperation = "screen";
    context.imageSmoothingEnabled = true;
    context.drawImage(beam, 0, 0, width, height);
    context.globalCompositeOperation = "source-over";
  }

  function drawCone(world: World, patrol: Patrol, x: number, y: number, tile: number, palette: Palette): void {
    if (patrol.kind === "spider") return;
    const { map, tick, player } = world;
    const gaze = gazeOf(patrol, tick);
    const rays = 14;
    context.beginPath();
    context.moveTo(x, y);
    for (let i = 0; i <= rays; i += 1) {
      const angle = gaze - VISION_HALF + (2 * VISION_HALF * i) / rays;
      let reach = VISION_RANGE;
      for (let along = 0.25; along < VISION_RANGE; along += 0.25) {
        if (tileAt(map, patrol.x + Math.cos(angle) * along, patrol.y + Math.sin(angle) * along) === ROCK) {
          reach = along;
          break;
        }
      }
      context.lineTo(x + Math.cos(angle) * reach * tile, y + Math.sin(angle) * reach * tile);
    }
    context.closePath();
    const hot = patrol.state === "chase";
    const wary = patrol.state === "suspicious" || patrol.alert > 0.3;
    if (player.ringOn) {
      // They cannot see you: the cone is an outline of what they would see.
      context.setLineDash([4, 5]);
      context.strokeStyle = css(palette.text2, 0.5);
      context.lineWidth = 1;
      context.stroke();
      context.setLineDash([]);
      return;
    }
    context.fillStyle = css(hot ? palette.accent : wary ? palette.link : palette.text2, hot ? 0.3 : wary ? 0.2 : 0.11);
    context.fill();
    context.strokeStyle = css(hot ? palette.accent : palette.muted, 0.55);
    context.lineWidth = 1;
    context.stroke();
  }

  function drawPatrol(patrol: Patrol, x: number, y: number, tile: number, tick: number, palette: Palette): void {
    const body = tile * 0.36;
    context.save();
    context.translate(x, y);
    if (patrol.kind === "spider") {
      context.rotate(patrol.facing);
      context.strokeStyle = css(palette.text2, 0.9);
      context.lineWidth = 1.5;
      const swing = reduced ? 0 : Math.sin(tick / 5) * 0.2;
      context.beginPath();
      for (const side of [-1, 1]) {
        for (let leg = 0; leg < 4; leg += 1) {
          const angle = side * (0.6 + leg * 0.55 + (leg % 2 ? swing : -swing));
          context.moveTo(0, 0);
          context.lineTo(Math.cos(angle) * body * 1.8, Math.sin(angle) * body * 1.8);
        }
      }
      context.stroke();
      context.fillStyle = css(palette.bg);
      context.strokeStyle = css(palette.link, 0.9);
      context.beginPath();
      context.ellipse(0, 0, body * 0.95, body * 0.7, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    } else {
      // A hard-cornered shield of a figure, lit from below by the lantern it carries.
      const glow = context.createRadialGradient(0, 0, 0, 0, 0, tile * 2.2);
      glow.addColorStop(0, css(palette.accent, 0.32));
      glow.addColorStop(1, css(palette.accent, 0));
      context.fillStyle = glow;
      context.fillRect(-tile * 2.2, -tile * 2.2, tile * 4.4, tile * 4.4);
      context.rotate(patrol.facing);
      context.fillStyle = css(palette.raised);
      context.strokeStyle = css(palette.link);
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(body * 1.3, 0);
      context.lineTo(-body * 0.7, body);
      context.lineTo(-body, 0);
      context.lineTo(-body * 0.7, -body);
      context.closePath();
      context.fill();
      context.stroke();
    }
    context.restore();
    // State never rests on colour alone.
    const mark = patrol.state === "chase" ? "!" : patrol.state === "suspicious" ? "?" : "";
    if (mark) {
      context.font = STAMP_FONT;
      context.textAlign = "center";
      context.fillStyle = css(palette.bg);
      context.fillRect(x - 8, y - tile * 1.15 - 13, 16, 18);
      context.fillStyle = css(palette.text);
      context.fillText(mark, x, y - tile * 1.15);
    }
  }

  function drawPlayer(world: World, x: number, y: number, tile: number, palette: Palette): void {
    const { player } = world;
    const body = tile * 0.42;
    if (ringFade > 0.01) {
      const halo = context.createRadialGradient(x, y, body, x, y, tile * 2.4);
      halo.addColorStop(0, css(palette.text, 0.4 * ringFade));
      halo.addColorStop(1, css(palette.text, 0));
      context.fillStyle = halo;
      context.fillRect(x - tile * 2.4, y - tile * 2.4, tile * 4.8, tile * 4.8);
    } else {
      const ember = context.createRadialGradient(x, y, 0, x, y, tile * 1.6);
      ember.addColorStop(0, css(palette.link, 0.22));
      ember.addColorStop(1, css(palette.link, 0));
      context.fillStyle = ember;
      context.fillRect(x - tile * 1.6, y - tile * 1.6, tile * 3.2, tile * 3.2);
    }
    context.save();
    context.translate(x, y);
    context.rotate(player.facing);
    context.globalAlpha = 1 - 0.45 * ringFade;
    context.fillStyle = css(palette.text);
    context.strokeStyle = css(ringFade > 0.5 ? palette.text : palette.bg);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(body * 1.25, 0);
    context.lineTo(-body * 0.8, body * 0.9);
    context.lineTo(-body * 0.8, -body * 0.9);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
    if (player.sneaking) {
      context.strokeStyle = css(palette.text2, 0.7);
      context.setLineDash([3, 4]);
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x, y, tile * 0.7, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
  }

  function drawChart(world: World, stage: StageArt, palette: Palette): void {
    const { map, eye, player, patrols, pickups } = world;
    const room = clamp(width * 0.2, 76, 170);
    const scale = Math.min(room / map.width, room / map.height);
    const w = map.width * scale;
    const h = map.height * scale;
    const left = width - w - 10;
    const top = width < 720 ? 104 : 74;
    context.fillStyle = css(palette.bg, 0.8);
    context.fillRect(left - 3, top - 3, w + 6, h + 6);
    context.globalAlpha = 0.9;
    context.imageSmoothingEnabled = false;
    context.drawImage(stage.chart, left, top, w, h);
    context.globalAlpha = 1;
    context.save();
    context.beginPath();
    context.rect(left, top, w, h);
    context.clip();
    const ox = left + map.origin.x * scale;
    const oy = top + map.origin.y * scale;
    context.fillStyle = css(palette.eye, 0.55);
    context.beginPath();
    context.moveTo(ox, oy);
    for (const side of [-1, 1]) {
      const angle = eye.angle + side * map.beamHalf;
      context.lineTo(ox + Math.cos(angle) * 900, oy + Math.sin(angle) * 900);
    }
    context.closePath();
    context.fill();
    context.fillStyle = css(palette.link);
    for (const patrol of patrols) context.fillRect(left + patrol.x * scale - 1.5, top + patrol.y * scale - 1.5, 3, 3);
    context.fillStyle = css(palette.text2);
    for (const pickup of pickups) {
      if (!pickup.taken) context.fillRect(left + pickup.x * scale - 1.5, top + pickup.y * scale - 1.5, 3, 3);
    }
    context.fillStyle = css(palette.focus);
    context.fillRect(left + map.exit.x * scale - 3, top + map.exit.y * scale - 3, 6, 6);
    context.fillStyle = css(palette.text);
    context.fillRect(left + player.x * scale - 2, top + player.y * scale - 2, 4, 4);
    context.restore();
    context.strokeStyle = css(palette.muted);
    context.lineWidth = 1;
    context.strokeRect(left - 3.5, top - 3.5, w + 7, h + 7);
  }

  return {
    resize,
    setReducedMotion(next) {
      reduced = next;
    },
    draw(previous, world, alpha, elapsed) {
      const stage = ensureArt(world);
      const { map, player } = world;
      clock += elapsed;
      const wanted = player.ringOn ? 1 : 0;
      ringFade = reduced ? wanted : ringFade + clamp(wanted - ringFade, -elapsed / RING_FADE_SECONDS, elapsed / RING_FADE_SECONDS);
      const palette: Palette = ringFade > 0.5 ? palettes.wraith : palettes.normal;
      const tint = (key: keyof Palette): Rgb => mix(palettes.normal[key], palettes.wraith[key], ringFade);

      for (const event of world.events) {
        if ((event === "spotted" || event === "eye-locked") && limiter.allow(clock)) {
          sting = 1;
          shake = 1;
        }
      }
      sting = Math.max(0, sting - elapsed / 0.45);
      shake = Math.max(0, shake - elapsed / 0.3);

      const tile = Math.max(14, Math.min(width / VIEW_TILES_WIDE, height / VIEW_TILES_TALL));
      const same = previous && previous.map === world.map;
      const px = same ? lerp(previous.player.x, player.x, alpha) : player.x;
      const py = same ? lerp(previous.player.y, player.y, alpha) : player.y;
      const viewW = width / tile;
      const viewH = height / tile;
      let cameraX = viewW >= map.width ? (map.width - viewW) / 2 : clamp(px - viewW / 2, 0, map.width - viewW);
      let cameraY = viewH >= map.height ? (map.height - viewH) / 2 : clamp(py - viewH / 2, 0, map.height - viewH);
      if (!reduced && shake > 0) {
        cameraX += Math.sin(clock * 53) * 0.08 * shake;
        cameraY += Math.cos(clock * 47) * 0.08 * shake;
      }
      const toX = (x: number): number => (x - cameraX) * tile;
      const toY = (y: number): number => (y - cameraY) * tile;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.fillStyle = css(tint("bg"));
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      const sx = cameraX * GROUND_SCALE;
      const sy = cameraY * GROUND_SCALE;
      const sw = viewW * GROUND_SCALE;
      const sh = viewH * GROUND_SCALE;
      if (ringFade < 1) context.drawImage(stage.normal, sx, sy, sw, sh, 0, 0, width, height);
      if (ringFade > 0) {
        context.globalAlpha = ringFade;
        context.drawImage(stage.wraith, sx, sy, sw, sh, 0, 0, width, height);
        context.globalAlpha = 1;
      }
      if (stage.lava) {
        // One breath every six seconds, so the fire moves without ever flickering.
        context.globalCompositeOperation = "screen";
        context.globalAlpha = (reduced ? 0.4 : 0.4 + 0.2 * Math.sin((clock * Math.PI * 2) / 6)) * (1 - ringFade);
        context.drawImage(stage.lava, 0, 0, stage.lava.width, stage.lava.height, toX(0), toY(0), map.width * tile, map.height * tile);
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }

      // Exit: a seam of heat in the ground, lit from under the rock.
      const ex = toX(map.exit.x);
      const ey = toY(map.exit.y);
      const lit = context.createRadialGradient(ex, ey, 0, ex, ey, tile * 3);
      lit.addColorStop(0, css(palettes.normal.focus, 0.6));
      lit.addColorStop(1, css(palettes.normal.focus, 0));
      context.fillStyle = lit;
      context.fillRect(ex - tile * 3, ey - tile * 3, tile * 6, tile * 6);

      const screenX = toX(px);
      const screenY = toY(py);
      drawFog(screenX, screenY, tile, tint("bg"));

      drawBeam(world, stage, cameraX, cameraY, tile, palette);

      for (const pickup of world.pickups) {
        if (pickup.taken) continue;
        const x = toX(pickup.x);
        const y = toY(pickup.y);
        context.fillStyle = css(palette.bg);
        context.strokeStyle = css(palette.text);
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x, y - tile * 0.42);
        context.lineTo(x + tile * 0.3, y + tile * 0.3);
        context.lineTo(x - tile * 0.3, y + tile * 0.3);
        context.closePath();
        context.fill();
        context.stroke();
      }

      context.fillStyle = css(palettes.normal.focus);
      context.fillRect(ex - tile * 0.32, ey - tile * 0.32, tile * 0.64, tile * 0.64);

      const before = same ? previous.patrols : null;
      const screens = world.patrols.map((patrol, index) => {
        const old = before?.[index];
        return {
          patrol,
          x: toX(old ? lerp(old.x, patrol.x, alpha) : patrol.x),
          y: toY(old ? lerp(old.y, patrol.y, alpha) : patrol.y),
        };
      });
      const onScreen = screens.filter(({ x, y }) => x > -tile * 9 && y > -tile * 9 && x < width + tile * 9 && y < height + tile * 9);
      for (const { patrol, x, y } of onScreen) drawCone(world, patrol, x, y, tile, palette);
      for (const { patrol, x, y } of onScreen) drawPatrol(patrol, x, y, tile, world.tick, palette);

      drawPlayer(world, screenX, screenY, tile, palette);

      if (!reduced) {
        context.fillStyle = css(tint("muted"), 0.55);
        for (const flake of flakes) {
          flake.y += flake.speed * elapsed * 3;
          flake.x += flake.speed * elapsed * 1.4;
          if (flake.y > 1) flake.y -= 1;
          if (flake.x > 1) flake.x -= 1;
          context.fillRect(flake.x * width, flake.y * height, flake.size, flake.size);
        }
      }

      const danger = dangerLevel(world.exposure, sting, reduced);
      if (danger > 0.01) {
        const edge = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.32, width / 2, height / 2, Math.max(width, height) * 0.72);
        edge.addColorStop(0, css(palette.eye, 0));
        edge.addColorStop(1, css(palette.eye, danger));
        context.fillStyle = edge;
        context.fillRect(0, 0, width, height);
      }

      drawChart(world, stage, palette);
    },
    destroy() {
      art = null;
    },
  };
}

