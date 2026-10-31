// Canvas colours come from the design tokens at runtime; nothing literal lives in this folder.

export type Rgb = readonly [number, number, number];

export interface Palette {
  bg: Rgb;
  surface: Rgb;
  raised: Rgb;
  rule: Rgb;
  muted: Rgb;
  text2: Rgb;
  text: Rgb;
  accent: Rgb;
  wax: Rgb;
  link: Rgb;
  focus: Rgb;
  /** The Eye's, in both worlds. */
  eye: Rgb;
}

const BLACK: Rgb = [0, 0, 0];

export function parseColor(value: string): Rgb {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(text);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  // Registered tokens can serialise as color(srgb 0.1 0.2 0.3).
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/i.exec(text);
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
  return BLACK;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function css(color: Rgb, alpha = 1): string {
  return `rgb(${Math.round(color[0])} ${Math.round(color[1])} ${Math.round(color[2])} / ${alpha})`;
}

/**
 * Both worlds, read once. The Ring world comes from a hidden probe carrying data-ring="on". The
 * normal world reads the raw palette, because the semantic tokens on <html> are mid-crossfade (or
 * cold) whenever the visitor arrives with the Ring on.
 */
export function readPalettes(host: HTMLElement): { normal: Palette; wraith: Palette } {
  const root = getComputedStyle(document.documentElement);
  const raw = (name: string): Rgb => parseColor(root.getPropertyValue(name));
  const eye = raw("--eye");
  const normal: Palette = {
    bg: raw("--iron-950"), surface: raw("--iron-900"), raised: raw("--iron-800"), rule: raw("--iron-600"),
    muted: raw("--ash-500"), text2: raw("--ash-300"), text: raw("--ash-100"),
    accent: raw("--ember-500"), wax: raw("--wax-700"), link: raw("--ember-300"), focus: raw("--heat-200"), eye,
  };
  const probe = document.createElement("span");
  probe.setAttribute("data-ring", "on");
  probe.hidden = true;
  host.append(probe);
  const style = getComputedStyle(probe);
  const token = (name: string): Rgb => parseColor(style.getPropertyValue(name));
  const wraith: Palette = {
    bg: token("--c-bg"), surface: token("--c-surface"), raised: token("--c-raised"), rule: token("--c-rule"),
    muted: token("--c-muted"), text2: token("--c-text-2"), text: token("--c-text"),
    accent: token("--c-accent"), wax: token("--c-action"), link: token("--c-link"), focus: token("--c-focus"), eye,
  };
  probe.remove();
  return { normal, wraith };
}
