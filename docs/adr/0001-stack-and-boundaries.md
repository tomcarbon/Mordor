# ADR 0001: Stack and module boundaries
Status: Accepted 2026-10-31 by the CEO, acting for VP Technology per the WO-0001 log; Compliance passed the allow-list, as the CEO reports. Author: principal-architect. Date: 2026-10-31. Work order: WO-0001.3.

## Context
WO-0001 fixes the stack (Vite, React, TypeScript, react-router, vitest; raw WebGL; no runtime network). This ADR accepts it unchanged and sets the contract for three developers. WO-0001.4 runs first; .5 and .6 then run in parallel on disjoint files.

## Decision: layout and ownership
```
src/main.tsx, src/app/                    .4  entry and providers; App.tsx (route table), Shell, Footer (fan notice), AttentionMeter, RingToggle, AudioToggle, Palette, palette-entries.ts, Takeover
src/state/, src/audio/                    .4  store.ts, context.tsx; index.ts (public API), engine internals
src/gl/                                   .4  WebGL helpers and shaders; imported only by routes/threshold
src/components/                           .4  Dialog (portals to body), useReducedMotion, other cross-route parts
src/styles/                               .4  tokens.css, fonts.css, global.css, ring.css
src/content/                              read-only  one typed module per route (<route>.ts), from WO-0001.2
src/routes/{threshold,not-found}/         .4
src/routes/{atlas,legions,chronicle,muster,_shared}/  .5  _shared/ is for .5's routes only; .6 must not import it
src/routes/road/, src/game/{sim,render,input}/, src/game/loop.ts  .6  routes/road is the only importer of game/
tests/smoke/run.mjs                       .4  auto-discovers tests/smoke/*.smoke.mjs; each <route>.smoke.mjs belongs to the route's owner
root files, public/, src/test/setup.ts    .4  package.json, package-lock.json, index.html, vite.config.ts, tsconfig*.json
```
- Every route folder has `index.tsx` with a default export, its own `*.module.css` (CSS Modules, no dependency) and colocated `*.test.ts(x)`.
- WO-0001.4 must leave the tree working with stubs: all seven `routes/*/index.tsx`, all lazy routes wired, all palette entries, every allow-listed package installed, and `npm run build`, `npm test` and `npm run smoke` passing. .5 and .6 replace stubs, nothing else.
- After .4, everything marked .4 or read-only is frozen. .5 and .6 do not edit it and do not run `npm install`. If they need a change, they stop that item and report to the CEO, not copy shared code. Content corrections go to WO-0001.2's owner.

## Decision: global store
A store instance plus React context, with no state library. Only `attention` persists (`localStorage`, key `mordor.attention.v1`, guarded by try/catch); ring and audio reset on load, because the parent permits only game and meter state and audio must start off. The game uses its own key `mordor.road.v1`.
```ts
// src/state/store.ts
export interface SiteState { readonly attention: number; readonly ring: boolean; readonly audio: boolean; readonly ringLocked: boolean } // attention: 0-100
export interface SiteStore {
  getSnapshot(): SiteState;                  // same object until something changes
  subscribe(listener: () => void): () => void;
  raiseAttention(amount: number): void;      // clamps to 100; multiplied while ring is on; no-op at 100
  resetAttention(): void;                    // only Takeover calls this
  setRing(on: boolean): void; setRingLocked(locked: boolean): void; setAudio(on: boolean): void;
}
export function createSiteStore(storage?: Pick<Storage, 'getItem' | 'setItem'> | null): SiteStore;
// src/state/context.tsx
export function SiteStoreProvider(props: { store?: SiteStore; children: React.ReactNode }): React.JSX.Element;
export function useSiteStore(): SiteStore; export function useSiteState<T>(select: (s: SiteState) => T): T; // useSyncExternalStore; select must return a primitive
// src/audio/index.ts
export function enableAudio(): void; export function disableAudio(): void; export function setWraith(on: boolean): void; // enable synchronously in the click handler
export function cue(name: 'stamp' | 'detected' | 'alarm' | 'found'): void; // silent no-op while audio is off
```
- `attention === 100` means "found": Shell shows Takeover, which calls `resetAttention()` when done. Shell owns the passive rise and pauses it on `/road`, so the takeover cannot interrupt the game. Routes may call `raiseAttention` for notable acts; the game does not.
- Ring: Shell sets `data-ring="on"` on `<html>`; filters apply to `<main>` only, since a filter on `<html>` would break `position: fixed`. Audio: `audio/` loads eagerly and stays tiny, because a lazy import risks losing the user gesture on iOS Safari. No `AudioContext` exists before opt-in.

## Decision: routing and splitting
- `HashRouter` from `react-router`, with `base: './'` in Vite. Paths are `/#/atlas`. Browser history needs a host rewrite for deep links, and a reload of `/atlas` or an unknown path would hit the host's 404, not ours. Hash needs no host config and works in any sub-path. We accept less tidy URLs; this site has no SEO need. In-page `#` anchors are unavailable. Serving from `file://` is not supported.
- Every route is `React.lazy` in `app/App.tsx`, under one `Suspense`. Nothing in `main.tsx`, `app/`, `state/`, `audio/`, `components/` or `styles/` may statically import `routes/`, `game/` or `gl/`. The smoke test proves it: loading `/#/atlas` must not fetch the Threshold or Road chunks.

## Decision: game architecture
- `game/sim/` is pure: no DOM, `window`, `Date`, `performance`, `Math.random`, React, or imports from outside `game/sim/`. API: `createWorld(seed: number): World`, `step(world: World, input: StepInput): World`, `SIM_DT` (fixed, 1/60 s). `World` is JSON-serialisable and holds the RNG state (seeded PRNG in `sim/rng.ts`) and an `events` list for the last step. Same seed plus same inputs gives a deep-equal `World`; this is a required test. Sim tests start with `// @vitest-environment node`, so a DOM reference throws.
- `game/loop.ts` runs the `requestAnimationFrame` accumulator, capping catch-up steps. `game/input/` turns keyboard, touch and pointer into `StepInput`, listening on the focused canvas, not `window`, so opening the Palette blurs it and pauses the game. `game/render/` reads `World` and never mutates it; reduced-motion and the flash limit (at most 3 per second) live here.
- `routes/road/` joins these to the app: it reads `ring` via `useSiteState`, passes it in `StepInput`, and maps sim events to `cue()`.

## Decision: testing
- `npm test` is `vitest run` on `src/**/*.test.{ts,tsx}`, default environment jsdom, no browser. jsdom has no canvas 2D, WebGL or WebAudio, so code must feature-detect and tests must stub them.
- `npm run smoke` is `node tests/smoke/run.mjs`: it serves an existing `dist/` with Vite's `preview()` API and drives system Chrome through `playwright-core` (`channel: 'chrome'`) at desktop and 390px widths. It fails on any console error or any request off the preview origin. No browser download.

## Decision: dependency allow-list
Anything else needs a new ADR. Versions: current stable at install, locked by `package-lock.json`. Fonts: exactly these three SIL OFL families (BRAND.md's title, reading and stamp faces).
- Runtime: `react`, `react-dom` (the UI); `react-router` (routing); `@fontsource-variable/eczar`, `@fontsource-variable/source-serif-4`, `@fontsource/ibm-plex-mono` (self-hosted fonts, no CDN).
- Dev, build: `vite`, `@vitejs/plugin-react` (build and JSX); `typescript`, `@types/react`, `@types/react-dom` (type checks).
- Dev, test: `vitest` (unit runner); `jsdom` (its DOM); `@testing-library/react` (component tests); `@testing-library/dom` (its required peer); `playwright-core` (smoke tests on system Chrome).

## Consequences
Good: disjoint work, game and WebGL off the first load of other routes, a testable game. Cost: a shared-file need found late stops work and goes through the CEO; stubs make .4 slightly larger.
Amendment 2026-10-31 (CEO decision): font rule raised from at most two families to the three named above, all OFL-1.1 per the CEO's `npm view`, because BRAND.md needs title, reading and stamp faces.

## Amendments 2026-10-31 (principal-architect, on CEO direction, after VP Cyber's pass with notes)
- Audio API: `setTension(amount: number): void` added to `src/audio` (0-1; Shell is the only caller; moves the filter, never the volume).
- `src/app/meter.ts` (.4): pure attention-level and observation selection. `Math.random` is allowed here; `random` stays injectable for tests.
- `Seal` and `DecreeHead` added to `src/components` (.4), and `src/assets/` (.4, sigil art), which the layout omitted. Frozen and read-only to .5 and .6 like the rest.
- `src/routes/_shared/` stands as laid out above (.5 only; `game/` keeps its own PRNG in `sim/rng.ts`, as sim purity requires).
- `src/test/setup.ts` stands: `getContext` returns null, so tests exercise the feature-detect path. Fake contexts belong in the test that needs them.
- Error boundary: one class component in `src/app/` (.4), wrapping the routes' `Suspense` so a failed chunk or a `createWorld` throw is caught. Static copy; logs no user input; reports nowhere.
- `engines` in package.json (.4): `"node": ">=22.22 <23 || >=24 <25 || >=26"`, stable lines only; odd-numbered lines are excluded.
- `?seed=` QA parameter on `/road`: `/#/road?seed=7`, read only in `routes/road/` via `useSearchParams`, digits only, otherwise a fresh seed. The sim sees only a number. It is untrusted input, and any seed that makes `createWorld` throw lands in the error boundary.
- Hold: `jsdom` stays on 29.x (locked 29.1.1), an exception to "current stable", because 30 is reported to need Node 24.15+ and this machine has 24.13. Exit: upgrade Node, then lift the hold.
- CSP: `<meta>` injected at build only (a small `apply: 'build'` plugin in `vite.config.ts`, so dev keeps working), required before any publish: `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data: blob:; base-uri 'none'; form-action 'none'`. Set `build.assetsInlineLimit: 0` so no font or script arrives as `data:`. `frame-ancestors` needs a host header and is decided with the host. Not yet implemented or tested; the smoke test must pass with it on.
- WO-0001.7: `ringLocked`/`setRingLocked` added to the store (not persisted; `routes/road` sets it while paused and clears it on leaving; `setRing` itself is unguarded, the visitor's toggle honours the lock). `Dialog` gains optional `dismissOnBackdrop`. `KeyboardHandlers.active?(): boolean` in `game/input/keyboard.ts` gates keys, Escape excepted.
- Banned: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` (with SECURITY.md, which governs). `Seal` has dropped `dangerouslySetInnerHTML`: it parses the bundled `sigil.svg` (`?raw`, our own asset only, never input) with `DOMParser` and builds React elements, keeping its accessible name.
