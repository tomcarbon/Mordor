just an experiment to see what different engines would do with this prompt, and then accepting all/most of the sub-prompts, and adding a game.

1) codex 20260218: not worthy of mordor
2) Claude01 20260319: "Build me a website worthy of Mordor." It's not too bad.
3) Claude02 20260319: "Build me a website worthy of Mordor. Do as much as you can." Game is cute, you're the eye of Sauron defending Mt. Doom. Isolated the game into its own branch.
4) CEO_Army (Claude Opus 5.5) 20261031: "Build me a React website worthy of Mordor. Do as much as you can." Run as an AI company: branch ceo_army.

## The Black Land (CEO_Army entry)

A React site for the official state portal of the Black Land, written in-universe by its own
bureaucracy: a fire-Eye hero, an interactive map, a bestiary, a timeline, a quiz that issues a
Writ of Service, and a stealth game, The Last Road. Multi-route, with an attention meter and a
command palette running across all of it.

Fan-work notice (from `src/content/site.ts`, shown in the footer):

> A non-commercial fan work. Mordor and related names are from the works of J.R.R. Tolkien. Not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises or any film studio.

### Running it

Requires Node `>=22.22 <23 || >=24 <25 || >=26` (the `engines` field in `package.json`).

```
npm ci              # install from package-lock.json
npm run dev         # Vite dev server
npm run build       # tsc --noEmit, then vite build into dist/
npm test            # vitest run
npm run smoke       # needs dist/ (run npm run build first) and a system Chrome
```

`npm run smoke` drives the installed Chrome (`channel: "chrome"`) through every route at desktop
and 390px phone widths, failing on console errors, page errors, off-origin requests or horizontal
overflow.

### Routes

The app uses a hash router, so every route is a hash URL:

- `/#/` The Threshold
- `/#/atlas` The Atlas
- `/#/legions` The Legions
- `/#/chronicle` The Chronicle
- `/#/muster` The Muster Office
- `/#/road` The Last Road
- any other hash shows the 404 page

### More

- `BRAND.md`: brand and design tokens
- `SECURITY.md`
- `LICENSES.md`
- `docs/adr/`: architecture decision records
