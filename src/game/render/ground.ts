// Pre-renders a stage once: volcanic ground for each world, the shadow mask, the lava glow, the chart.
import { inShadow, LAVA, PIT, ROCK, THORN, WEB } from "../sim";
import type { StageMap } from "../sim";
import { css, mix } from "./palette";
import type { Palette, Rgb } from "./palette";

export const GROUND_SCALE = 10;
export const SHADOW_SCALE = 4;

export interface StageArt {
  map: StageMap;
  normal: HTMLCanvasElement;
  wraith: HTMLCanvasElement;
  /** Opaque where a rock hides the ground from the Eye. */
  shadow: HTMLCanvasElement;
  /** Lava alone, for a slow breathing overlay; null where a stage has none. */
  lava: HTMLCanvasElement | null;
  chart: HTMLCanvasElement;
}

function surface(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d")!];
}

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * u;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * u;
  return top + (bottom - top) * v;
}

function fbm(x: number, y: number): number {
  return valueNoise(x, y) * 0.55 + valueNoise(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + valueNoise(x * 4.3 + 19, y * 4.3 + 11) * 0.15;
}

function clampIndex(value: number, size: number): number {
  return Math.max(0, Math.min(size - 1, value));
}

function paintGround(map: StageMap, palette: Palette): HTMLCanvasElement {
  const { width, height, tiles } = map;
  const scale = GROUND_SCALE;
  const [canvas, ctx] = surface(width * scale, height * scale);
  const image = ctx.createImageData(canvas.width, canvas.height);
  const tileOf = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? ROCK : tiles[y * width + x]!;
  let at = 0;
  for (let py = 0; py < canvas.height; py += 1) {
    const ty = py / scale;
    for (let px = 0; px < canvas.width; px += 1) {
      const tx = px / scale;
      // Tiles decide the rules; the eye gets a broken edge. Collision stays on the grid.
      const wobbleX = (valueNoise(tx * 1.9 + 5, ty * 1.9) - 0.5) * 0.7;
      const wobbleY = (valueNoise(tx * 1.9, ty * 1.9 + 5) - 0.5) * 0.7;
      const gx = clampIndex(Math.floor(tx + wobbleX), width);
      const gy = clampIndex(Math.floor(ty + wobbleY), height);
      const tile = tileOf(gx, gy);
      const grain = fbm(tx * 0.45, ty * 0.45);
      const fine = valueNoise(tx * 5, ty * 5);
      let color: Rgb;
      if (tile === ROCK) {
        color = mix(palette.bg, palette.surface, grain * 0.7 + fine * 0.3);
        // Light from below: the south face of a rock catches the fire, every other edge the ash.
        const edge = 0.3;
        const southOpen = tileOf(gx, clampIndex(Math.floor(ty + wobbleY + edge), height)) !== ROCK;
        const northOpen = tileOf(gx, clampIndex(Math.floor(ty + wobbleY - edge), height)) !== ROCK;
        const eastOpen = tileOf(clampIndex(Math.floor(tx + wobbleX + edge), width), gy) !== ROCK;
        const westOpen = tileOf(clampIndex(Math.floor(tx + wobbleX - edge), width), gy) !== ROCK;
        if (southOpen) color = mix(palette.accent, palette.rule, 0.35 + fine * 0.3);
        else if (northOpen || eastOpen || westOpen) color = mix(palette.rule, palette.muted, fine * 0.5);
      } else if (tile === LAVA) {
        const heat = fbm(tx * 0.7 + 40, ty * 0.7);
        color = heat > 0.52 ? mix(palette.accent, palette.link, Math.min(1, (heat - 0.52) * 5)) : mix(palette.wax, palette.accent, heat * 1.9);
      } else if (tile === PIT) {
        // A sunken bowl of pale ash: dark floor, a dusted lip.
        const lip = 0.28;
        const atLip =
          tileOf(clampIndex(Math.floor(tx + wobbleX + lip), width), gy) !== PIT ||
          tileOf(clampIndex(Math.floor(tx + wobbleX - lip), width), gy) !== PIT ||
          tileOf(gx, clampIndex(Math.floor(ty + wobbleY + lip), height)) !== PIT ||
          tileOf(gx, clampIndex(Math.floor(ty + wobbleY - lip), height)) !== PIT;
        color = atLip ? mix(palette.rule, palette.text2, 0.3 + fine * 0.3) : mix(palette.bg, palette.surface, grain + fine * 0.3);
      } else {
        color = mix(palette.raised, palette.rule, grain * 0.75 + fine * 0.25);
        // Seams in the crust, lit from beneath. Rationed: the fire is a wound, not a theme.
        const seam = Math.abs(fbm(tx * 0.5 + 90, ty * 0.5) - 0.5);
        if (seam < 0.009 && valueNoise(tx * 0.16 + 30, ty * 0.16) > 0.55) color = mix(color, palette.accent, (0.009 - seam) * 70);
      }
      image.data[at] = color[0];
      image.data[at + 1] = color[1];
      image.data[at + 2] = color[2];
      image.data[at + 3] = 255;
      at += 4;
    }
  }
  ctx.putImageData(image, 0, 0);

  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y * width + x];
      const X = x * scale;
      const Y = y * scale;
      if (tile === WEB) {
        ctx.strokeStyle = css(palette.text2, 0.42);
        ctx.beginPath();
        for (let i = 0; i < 4; i += 1) {
          const a = hash(x + i, y) * Math.PI * 2;
          ctx.moveTo(X + 5, Y + 5);
          ctx.lineTo(X + 5 + Math.cos(a) * 9, Y + 5 + Math.sin(a) * 9);
        }
        ctx.stroke();
      } else if (tile === THORN) {
        ctx.strokeStyle = css(palette.muted, 0.6);
        ctx.beginPath();
        for (let i = 0; i < 5; i += 1) {
          const sx = X + hash(x, y + i) * scale;
          const sy = Y + hash(x + i, y) * scale;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (hash(i, x) - 0.5) * 8, sy - 3 - hash(i, y) * 5);
        }
        ctx.stroke();
      }
    }
  }
  return canvas;
}

function paintShadow(map: StageMap): HTMLCanvasElement {
  const [canvas, ctx] = surface(map.width * SHADOW_SCALE, map.height * SHADOW_SCALE);
  const image = ctx.createImageData(canvas.width, canvas.height);
  let at = 3;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (inShadow(map, (x + 0.5) / SHADOW_SCALE, (y + 0.5) / SHADOW_SCALE)) image.data[at] = 255;
      at += 4;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function paintLava(map: StageMap, palette: Palette): HTMLCanvasElement | null {
  if (!map.tiles.includes(LAVA)) return null;
  const scale = 4;
  const [canvas, ctx] = surface(map.width * scale, map.height * scale);
  ctx.fillStyle = css(palette.link, 0.5);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.tiles[y * map.width + x] === LAVA) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

function paintChart(map: StageMap, palette: Palette): HTMLCanvasElement {
  const [canvas, ctx] = surface(map.width, map.height);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = map.tiles[y * map.width + x];
      ctx.fillStyle = css(tile === ROCK ? palette.rule : tile === LAVA ? palette.accent : palette.surface);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function buildStageArt(map: StageMap, normal: Palette, wraith: Palette): StageArt {
  const shadow = paintShadow(map);
  const bake = (palette: Palette): HTMLCanvasElement => {
    const ground = paintGround(map, palette);
    const ctx = ground.getContext("2d")!;
    // Shelter must read at a glance, sweep or no sweep: tint the mask, then lay it over the ground.
    const [tinted, tintCtx] = surface(shadow.width, shadow.height);
    tintCtx.drawImage(shadow, 0, 0);
    tintCtx.globalCompositeOperation = "source-in";
    tintCtx.fillStyle = css(palette.bg);
    tintCtx.fillRect(0, 0, tinted.width, tinted.height);
    ctx.globalAlpha = 0.58;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tinted, 0, 0, ground.width, ground.height);
    ctx.globalAlpha = 1;
    return ground;
  };
  return {
    map, shadow, normal: bake(normal), wraith: bake(wraith),
    lava: paintLava(map, normal), chart: paintChart(map, normal),
  };
}
