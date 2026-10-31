# BRAND: Official State Portal of the Black Land
Owner: art-director. WO-0001.1, 2026-10-31. Tokens: `src/styles/tokens.css`. Use only tokens.

## Look
A ministry built on a volcano. Iron plate, ash stock, wax seals, and one heat source below it all.
- **Light comes from below.** Never top-lit. Glow sits under an object, as in `--shadow-ember`.
- **Ember is rationed.** Iron and ash cover about 90% of any screen; red is a wound, not a theme.
- **Bureaucracy is the menace.** File numbers, stamps, seals and ruled forms do the frightening.
- **Texture:** procedural ash grain only (inline SVG `feTurbulence`, at `--grain-opacity`).
- **Banned:** gradient text; text glow or `text-shadow`; emoji; flames as ornament; blackletter or hybrids;
  Cinzel, Trajan or any inscriptional-capitals font; sepia parchment; ornamental dividers; rounded corners; pill
  buttons; orange-on-black as the main scheme; soft drop-shadow cards; floating ember particles.
- **IP and history:** no film or book artwork, Tengwar, Ring-verse or tower silhouette. The WebGL
  Eye is built from its own striated iris, not the film's flame-wreathed design. No real-world
  regime imagery: no eagles, armbands or pinwheels. Radial repeats are fine only if mirror-true.

## Typography
| Role | Package (`npm`, OFL 1.1) | Import | Weights | Use |
|---|---|---|---|---|
| Voice | `@fontsource-variable/eczar` | `index.css` | 700, 800 | Titles, proclamations |
| Record | `@fontsource-variable/source-serif-4` | `index.css`, `wght-italic.css` | 400, 600 | All reading text |
| Stamp | `@fontsource/ibm-plex-mono` | `400.css`, `500.css`, `600.css` | 400, 500, 600 | File nos, labels, meters, nav |

- Voice (`--font-voice`, likewise `--font-record`, `--font-stamp`) is sentence case, **never all caps**: hewn lowercase is the look,
  capitals drift towards Roman inscription. Min size `--fs-h3`. Never for body or labels. Wght axis tops at 800.
- Record: `--fs-body`, `--lh-body`, max `--measure`. Left-aligned, never justified.
- Stamp: uppercase, `--ls-stamp`, `--fs-stamp`, weight 500. Use it for all numerals in meters.
- Page title: `--fs-monument`, `--lh-monument`, weight 800, allowed to run past the column edge.

## Colour
Use semantic `--c-*` tokens. `--c-accent` and `--c-seal` are for fills, rules and text at 24px+.
`--c-eye` is the same in both worlds and is the Eye's alone. Never on decree stock.
Ratios: WCAG 2.x, calculated by hand from the sRGB formula, one decimal. Not machine-checked yet.

| Normal world, text on | `--c-bg` #0E0C0B | `--c-surface` #171412 | `--c-raised` #231E1B |
|---|---|---|---|
| `--c-text` #E8E1D6 | 15.0 | 14.1 | 12.7 |
| `--c-text-2` #B9AFA2 | 9.0 | 8.5 | 7.6 |
| `--c-muted` #93897C | 5.7 | 5.3 | 4.8 |
| `--c-link` #EC7350 | 6.6 | 6.2 | 5.6 |
| `--c-accent` #C8321A (large/UI only) | 3.6 | 3.4 | 3.1 |

| Wraith-world, text on | `--c-bg` #1E2428 | `--c-surface` #293035 | `--c-raised` #353D43 |
|---|---|---|---|
| `--c-text` #E2E7E8 | 12.6 | 10.7 | 8.9 |
| `--c-text-2` #BCC6CA | 9.0 | 7.7 | 6.4 |
| `--c-muted` #A1ADB3 | 6.8 | 5.8 | 4.8 |
| `--c-link` #CFE0E6 | 11.6 | 9.9 | 8.1 |

| Other pairs | Normal | Ring |
|---|---|---|
| Decree ink on decree stock | 10.3 | 9.4 |
| Decree muted on decree stock | 5.7 | 4.8 |
| Decree stamp on decree stock | 5.3 | 5.2 |
| `--c-on-action` on `--c-action` (hover) | 7.9 (6.3) | 6.1 (5.0) |
| `--c-eye` on `--c-bg` (surface, raised) | 6.3 (5.9, 5.3) | 5.0 (4.3 and 3.6: UI/large only) |
| `--c-focus` on `--c-bg` | 14.7 | 14.3 |
| `--c-border` on `--c-bg` (raised) | 5.7 (4.8) | 5.2 (3.7) |

Filled buttons need a `--c-border` border (`--c-action` on page is only 1.9). `--c-rule` is decorative.

## Layout
- Hard edges (`--radius` 0). 12 columns at 960px+, single column under it; `--sp-gutter` margins.
- Body text sits in a narrow column offset left; the margin column holds file numbers and stamps.
- Every route opens with a **decree head**: Stamp file number, monument title, seal at right, then
  a `--bw-slab` rule. Scale is the threat: leave room above the title and let it dominate.
- Sections divide by rules and `--sp-8` or `--sp-9` of space, never by card grids of equal boxes.
- **Decree surface:** add `data-surface="decree"` for writs and notices. It remaps the tokens.
  Stock is flat, square-cut, and at most one per viewport, so it stays an event.
- **Status strip** holds Attention, Ring and Sound, `--strip-h` tall, on `--c-bg` (the Eye's text
  floor), fixed top at 720px+, bottom under it. Pad the page to clear it. No sideways scroll at 390px.
- **Sigil:** `src/assets/sigil.svg`. Inline it (Vite `?raw`) to take `color: var(--c-seal)`; as `<img>`
  it stays vermilion. Minimum 48px, below that use `public/favicon.svg`. Never recolour with gradients.
  Alt text comes from the component ("Seal of the Black Land"), or `alt=""` when decorative.

## Motion
Mass, not bounce. Things are lowered, stamped or sealed; they do not float.
- `--ease-mass` for panels and routes (`--dur-heavy`); `--ease-stamp` for stamps (`--dur-stamp`).
- **Stamp landing:** scale 1.06 to 1 and opacity 0 to 1, once, at `--stamp-rotate`. No overshoot.
- **Banned:** springs, parallax, pulsing glows, looping decoration outside the Eye and game.
- **Takeover:** one slow fade over `--dur-takeover`, one hold, one release. No strobe, shake, or
  pulse; fade in from `--iron-950`, and never saturate the full screen with red.
- **Reduced motion:** duration tokens collapse automatically. Canvas/WebGL stop looping: still Eye, stepped Chronicle.
  **One exception:** the `/road` beam still sweeps; it is the mechanic. Say so before Start; never autostart; offer pause; stop all decorative motion.
- **Flash floor:** no repeating luminance change faster than `--flash-min-period` (WCAG 2.3.1).

## Sound
Off until the visitor opts in; the choice persists locally. Never autoplay, even on return visits.
- A generative drone: two detuned low oscillators at 40 to 80 Hz, plus filtered noise like wind
  over slag. No melody, voices or speech. Master peak at or under -18 dBFS.
- Fade in and out over 1.5 s. Suspend when the tab is hidden. Stamps: one low thud, at most 1 per second.
- Attention raises tension slowly via filter opening, never by volume jumps or alarms.
- **Ring on:** low-pass near 500 Hz, detune -30 cents, add a thin high partial near the edge of hearing.
- Every sound has a visual equivalent. Sound is never the only signal. The toggle has a text label.

## Wraith-world (`data-ring="on"` on `<html>`)
The Ring removes warmth, not legibility. The world goes cold and grey; only the Eye stays hot.
- Colour shifts via tokens only. Never put `filter` on text or a text container: ratios above assume
  none. `--ring-media-filter` applies to SVG art, canvas and WebGL only. Ember glow and red seals go.
- **Edges:** one fixed, `pointer-events: none` overlay at `--z-ring-edge`, with `backdrop-filter:
  blur(var(--ring-edge-blur))`, masked by a radial mask to the outer 12% of the viewport, at
  `--ring-edge-opacity`. Reading column stays sharp. Under 720px, limit it to the top and bottom 6%.
  Pure CSS fallback: no blur, nothing else changes. Keep the status strip above it and crisp.
- Colours crossfade over `--dur-ring` with `--ease-mass` on `background-color`, `color` and
  `border-color` only. Never flash in or out. State the mode in text: `aria-pressed` on the toggle
  plus a visible Stamp label.

## Accessibility floors
- Body text 4.5:1, large text and UI boundaries 3:1, in both worlds and on decree stock.
- Body 18px, nothing under 13px. Touch targets at least `--tap-min`. Text survives 200% zoom.
- Every interactive element shows `outline: var(--focus-ring)` with `--focus-offset` on
  `:focus-visible`. Never remove it. Links in body text are underlined.
- State never relies on colour alone: the meter shows a number; filters show pressed state.
- Canvas, WebGL and map content has a text alternative or a keyboard-reachable equivalent.
- Meter changes are polite and throttled for screen readers (`aria-live`, band changes only).

## Review criteria
A deliverable fails if it shows a banned item, uses literal colours outside the tokens, breaks a floor
above, loses legibility with the Ring on, or could pass for a generic dark-fantasy template.
