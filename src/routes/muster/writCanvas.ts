// Draws the Writ of Service for download. Everything happens on this page: the canvas is local,
// the blob is local, and the name is passed in as an argument and goes nowhere else.
import sigil from "../../assets/sigil.svg?raw";
import type { Station } from "../../content/muster";
import { writ } from "../../content/muster";
import { createRng, hashText } from "../_shared/rng";
import { fillTokens } from "../_shared/fillTokens";

export const WRIT_WIDTH = 1240;
export const WRIT_HEIGHT = 1754;
const MARGIN = 112;

const VOICE = '"Eczar Variable", Georgia, serif';
const RECORD = '"Source Serif 4 Variable", Georgia, serif';
const STAMP = '"IBM Plex Mono", ui-monospace, monospace';

export interface WritInk {
  stock: string;
  ink: string;
  muted: string;
  stamp: string;
}

export interface WritText {
  name: string;
  preamble: string;
  clauses: string[];
  closing: string;
}

export function writText(name: string, station: Station): WritText {
  const shown = name.trim() || writ.fallbackName;
  return {
    name: shown,
    preamble: fillTokens(writ.preamble, { name: shown, station: station.title }),
    clauses: writ.clauses,
    closing: fillTokens(writ.closingLine, { closing: station.closing }),
  };
}

/** Greedy word wrap. A word too long for the line is broken, since names can be anything. */
export function wrapLines(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word;
    if (measure(trial) <= maxWidth) {
      line = trial;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    let rest = word;
    while (measure(rest) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Canvas text silently falls back if a webfont is not ready, so each face is asked for by the
 * exact text it will set: that pulls in the right unicode-range files for any name.
 */
async function loadFonts(all: string): Promise<void> {
  if (!("fonts" in document)) return;
  const requests = [
    `800 96px ${VOICE}`,
    `700 48px ${VOICE}`,
    `400 32px ${RECORD}`,
    `600 32px ${RECORD}`,
    `italic 400 32px ${RECORD}`,
    `500 22px ${STAMP}`,
    `600 22px ${STAMP}`,
  ];
  await Promise.all(requests.map((font) => document.fonts.load(font, all).catch(() => [])));
  await document.fonts.ready;
}

function loadSeal(colour: string): Promise<HTMLImageElement> {
  const svg = sigil.replace(/<!--[\s\S]*?-->/g, "").replace(/color="[^"]*"/, `color="${colour}"`);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return image.decode().then(() => image);
}

function spaced(context: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): void {
  let at = x;
  for (const char of text) {
    context.fillText(char, at, y);
    at += context.measureText(char).width + tracking;
  }
}

function spacedWidth(context: CanvasRenderingContext2D, text: string, tracking: number): number {
  let width = 0;
  for (const char of text) width += context.measureText(char).width + tracking;
  return width - tracking;
}

function paintStock(context: CanvasRenderingContext2D, ink: WritInk, seed: number): void {
  context.fillStyle = ink.stock;
  context.fillRect(0, 0, WRIT_WIDTH, WRIT_HEIGHT);
  // Ash in the paper: flecks, not sepia.
  const rng = createRng(seed);
  context.fillStyle = ink.ink;
  for (let i = 0; i < 9000; i += 1) {
    context.globalAlpha = 0.02 + rng() * 0.09;
    const size = 0.8 + rng() * rng() * 2.6;
    context.fillRect(rng() * WRIT_WIDTH, rng() * WRIT_HEIGHT, size, size);
  }
  context.globalAlpha = 1;
}

export async function drawWrit(canvas: HTMLCanvasElement, text: WritText, station: Station, ink: WritInk): Promise<void> {
  const allText = [writ.office, writ.title, text.preamble, ...text.clauses, text.closing, writ.dateLine, writ.signature, writ.sealText, station.title, text.name].join(" ");
  const [seal] = await Promise.all([loadSeal(ink.stamp), loadFonts(allText)]);

  canvas.width = WRIT_WIDTH;
  canvas.height = WRIT_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");
  const measure = (value: string) => context.measureText(value).width;
  const width = WRIT_WIDTH - MARGIN * 2;

  paintStock(context, ink, hashText(station.id));
  context.textBaseline = "alphabetic";

  // Head
  context.fillStyle = ink.muted;
  context.font = `500 24px ${STAMP}`;
  const office = writ.office.toUpperCase();
  spaced(context, office, MARGIN, 150, 3.4);
  context.fillStyle = ink.ink;
  context.font = `800 118px ${VOICE}`;
  context.fillText(writ.title, MARGIN - 4, 282);
  context.fillRect(MARGIN, 322, width, 10);

  // Body: the name and station can be any length, so the Record size gives way before the page does.
  let y = 420;
  let size = 42;
  let lines: string[] = [];
  for (; size >= 24; size -= 2) {
    context.font = `400 ${size}px ${RECORD}`;
    lines = wrapLines(text.preamble, width, measure);
    if (lines.length * size * 1.42 <= 310) break;
  }
  context.fillStyle = ink.ink;
  for (const entry of lines) {
    context.fillText(entry, MARGIN, y);
    y += size * 1.42;
  }

  y += 44;
  context.font = `700 80px ${VOICE}`;
  for (const entry of wrapLines(station.title, width, measure)) {
    context.fillText(entry, MARGIN, y + 34);
    y += 90;
  }

  y += 44;
  context.fillRect(MARGIN, y, width, 2);
  y += 74;
  context.font = `400 33px ${RECORD}`;
  text.clauses.forEach((clause, index) => {
    context.fillStyle = ink.muted;
    context.save();
    context.font = `500 24px ${STAMP}`;
    context.fillText(String(index + 1).padStart(2, "0"), MARGIN, y);
    context.restore();
    context.fillStyle = ink.ink;
    for (const entry of wrapLines(clause, width - 76, measure)) {
      context.fillText(entry, MARGIN + 76, y);
      y += 48;
    }
    y += 16;
  });

  y += 40;
  context.font = `italic 400 38px ${RECORD}`;
  for (const entry of wrapLines(text.closing, width, measure)) {
    context.fillText(entry, MARGIN, y);
    y += 52;
  }

  // Foot, anchored to the bottom of the sheet.
  const footY = WRIT_HEIGHT - 150;
  context.fillStyle = ink.ink;
  context.font = `400 28px ${RECORD}`;
  context.fillText(writ.dateLine, MARGIN, footY - 76);
  context.fillRect(MARGIN, footY - 28, 520, 2);
  context.fillStyle = ink.muted;
  context.font = `500 21px ${STAMP}`;
  spaced(context, writ.signature.toUpperCase(), MARGIN, footY + 8, 2);

  // The seal, struck once and a little off true, with ink missing where the die did not bite.
  const sealSize = 300;
  const cx = WRIT_WIDTH - MARGIN - sealSize / 2 + 18;
  const cy = footY - 92;
  context.save();
  context.translate(cx, cy);
  context.rotate((-2.5 * Math.PI) / 180);
  context.drawImage(seal, -sealSize / 2, -sealSize / 2, sealSize, sealSize);
  context.restore();
  const rng = createRng(hashText(`${station.id}/seal`));
  context.fillStyle = ink.stock;
  for (let i = 0; i < 1400; i += 1) {
    const angle = rng() * Math.PI * 2;
    const reach = Math.sqrt(rng()) * (sealSize / 2);
    context.globalAlpha = 0.25 + rng() * 0.5;
    const fleck = 0.8 + rng() * 2.2;
    context.fillRect(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach, fleck, fleck);
  }
  context.globalAlpha = 1;

  context.fillStyle = ink.stamp;
  context.font = `600 21px ${STAMP}`;
  const label = writ.sealText.toUpperCase();
  spaced(context, label, cx - spacedWidth(context, label, 2) / 2, cy + sealSize / 2 + 42, 2);
}

export function writBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no blob"))), "image/png");
  });
}
