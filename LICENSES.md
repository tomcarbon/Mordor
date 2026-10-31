# Licence inventory: Mordor (`ceo_army`)
Author: compliance-licensing. Checked: 2026-10-31. Work order: WO-0001 (allow-list in ADR 0001).
Project licence: MIT (`LICENSE`, Copyright (c) 2026 Tom Carbon).

This is a checklist for humans to act on. It is not legal advice, and its author is not a lawyer.

Versions are those in `package-lock.json`. Licences come from the lockfile's `license` fields, which
repeat what each package declares. The direct packages were also checked on registry.npmjs.org, and
the three fonts against their packaged `LICENSE` files.

## Packages
| Package | Licence | Runtime or dev | Verdict |
|---|---|---|---|
| `react` 19.3.1 | MIT | Runtime | Pass |
| `react-dom` 19.3.1 | MIT | Runtime | Pass |
| `react-router` 8.5.1 | MIT | Runtime | Pass |
| `@fontsource/ibm-plex-mono` 5.3.0 | OFL-1.1 | Runtime | Pass |
| `@fontsource-variable/eczar` 5.3.0 | OFL-1.1 | Runtime | Pass |
| `@fontsource-variable/source-serif-4` 5.3.1 | OFL-1.1 | Runtime | Pass with notes (see Fonts) |
| `vite` 8.3.5 | MIT | Dev | Pass with notes (see `lightningcss`) |
| `@vitejs/plugin-react` 6.1.2 | MIT | Dev | Pass |
| `typescript` 7.0.2 | Apache-2.0 | Dev | Pass |
| `@types/react` 19.3.0 | MIT | Dev | Pass |
| `@types/react-dom` 19.3.0 | MIT | Dev | Pass |
| `vitest` 5.0.5 | MIT | Dev | Pass |
| `jsdom` 29.1.1 | MIT | Dev | Pass |
| `@testing-library/react` 16.3.3 | MIT | Dev | Pass |
| `@testing-library/dom` 10.4.2 | MIT | Dev | Pass |
| `playwright-core` 1.64.1 | Apache-2.0 | Dev | Pass |

Apache-2.0 sits comfortably beside an MIT project here: both packages are tools, and neither ships
in `dist/`.

## Fonts
**Rule (ADR 0001 as amended):** exactly the three SIL OFL families in the table, matching `BRAND.md`.
Any other font needs a new ADR, and a check of both its registry `license` field and its packaged
`LICENSE`.

**Eczar:** the packaged `LICENSE` reads "Copyright 2014 The Eczar Project Authors
(https://github.com/rosettatype/eczar)", OFL 1.1, no Reserved Font Name. Upstream not checked.

**Source Serif 4 attribution:** the packaged `LICENSE` names "Google Inc." and no Reserved Font Name.
Adobe's upstream licence reads "Copyright 2014 - 2023 Adobe ... with Reserved Font Name 'Source'".
Treat Adobe's as correct if this family stays. Use the files unmodified. No action is needed unless
the site is published.

## Lockfile audit (148 entries)
`package-lock.json` lists 148 packages, excluding the project's own root entry. Each has one
plain `license` value, with no missing fields, no `SEE LICENSE` and no either/or expressions. Its 16
direct packages match the ADR allow-list exactly.

| Licence | Entries | Which |
|---|---:|---|
| MIT | 97 | Includes all runtime code except the fonts |
| Apache-2.0 | 26 | `typescript` and its 20 platform packages, `playwright-core`, `aria-query`, `detect-libc`, `expect-type`, `xml-name-validator` |
| MPL-2.0 | 12 | `lightningcss` and its 11 platform packages |
| OFL-1.1 | 3 | The three fonts |
| ISC | 2 | `picocolors`, `saxes` |
| BSD-2-Clause | 2 | `entities`, `webidl-conversions` |
| BSD-3-Clause | 2 | `source-map-js`, `tough-cookie` |
| MIT-0 | 2 | `@csstools/color-helpers`, `@csstools/css-syntax-patches-for-csstree` |
| BlueOak-1.0.0 | 1 | `lru-cache` |
| CC0-1.0 | 1 | `mdn-data` |

- **Verdict: pass with notes.** No GPL, AGPL, LGPL or unlicensed entry. All are compatible with an
  MIT project, given how they are used here.
- **Runtime is 9 entries, all MIT or OFL:** `react`, `react-dom`, `react-router`, `scheduler`,
  `cookie-es`, `@remix-run/route-pattern` and the three fonts. The other 139 are marked `dev` or
  `devOptional`, so they are not installed in production and should not reach `dist/`.
- **`lightningcss` (MPL-2.0) is the one licence to note.** MPL is file-level copyleft: its duties
  attach to changing or redistributing `lightningcss` itself. We only run it as a build tool and do
  not ship it, so it is no concern unless someone patches or vendors it.
- **Limit:** this reads declared licences. It does not inspect each package's files or any code
  bundled inside them. Re-run it whenever the lockfile changes.

## If `dist/` is ever published
- MIT requires the copyright and permission notices to travel with copies. Include a third-party
  notices file for React and the other bundled packages, because minifiers may strip their headers.
- OFL requires the licence and copyright notices to travel with the fonts. Include them in `dist/`.

## Trip-wire note: Tolkien IP
This is not legal advice. Ask a qualified lawyer before relying on any of it.

**What we rely on now:** the work is private, non-commercial and unpublished, so nobody outside the
project sees it and no money moves. That makes a dispute unlikely. It does not give us any right to
the material. We hold no licence, and a fan-work notice is a courtesy, not a permission. Keeping out
quoted text and film imagery (WO-0001) lowers the risk, but does not remove it.

**Film imagery, for a chair to weigh before any publishing:** this is one reviewer's view of the
look, made from memory of the films without a side-by-side, and it is not a legal finding.
- **Fire-Eye (`src/gl/`): pass with notes; not cleared for publishing.** It is procedural and copies
  no film asset, and it has no tower or wreath of flame. The books support a fire-rimmed eye with a
  black slit. But the look runs close to the film: a wide almond of red-orange fire, radiating
  striations and a thin black vertical slit, filling the screen, is what many viewers will call the
  film's Eye on sight. Dropping the flame wreath does not change that. It is the nearest thing to
  film imagery on the site. Moving towards the book would add distance: a yellow, cat-like iris
  with fire at the rim only, and less of the orange radial burst.
- **Sigil (`src/assets/sigil.svg`): pass.** A toothed ring, nine straight blades and a central
  lozenge. I recognise no film emblem in it, and no Eye or tower. Its blades are mirror-symmetric
  and not canted, so it meets `BRAND.md`'s no-pinwheel rule.

**What the rights-holders say:** the Tolkien Estate's FAQ says it "takes copyright very seriously",
that "you cannot copy any part of Tolkien's writings or images", and, in its fan fiction answer, that
you cannot "create materials which refer to the characters, stories, places, events" of his works.
It also says character and place names are "trademarked by Middle-earth Enterprises, LLC". Whether
any of this binds a free fan site is a question for a lawyer, but the site is built on those names.

**What would change if published:** two trip-wires in `docs/legal-guidelines.md` fire, "someone
outside the project uses it" and "you publish under a name". It also needs human approval under
`docs/approval-gates.md`. Our present reliance on being private would end, so:
- Do a lawyer conversation first; the guidelines' process applies.
- Revisit `LICENSE`. MIT lets anyone "use, copy, modify ... and/or sell" the Software. We can only
  license what we wrote, not Tolkien's names and setting, and an unscoped MIT grant blurs that.
- Taking money of any kind fires a further trip-wire and makes the position materially worse.

**Near now:** a push of `ceo_army` is publication, because `origin` is the public repository
`github.com/tomcarbon/Mordor`. That repository already exposes earlier work: on 2026-10-31 its public
`claude02` branch had an `index.html` titled "Mordor — The Dark Land" containing the film line "One
does not simply walk into Mordor", a verse from the book and a Black Speech inscription, with no
fan-work notice, beside an MIT `LICENSE`. No live site was found at `tomcarbon.github.io/Mordor`. The
other branches were not read. The claim "not published" holds for this `ceo_army` work only, and
that older material is for a human chair to decide on.
