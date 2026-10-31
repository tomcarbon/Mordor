import { nav, palette } from "../content/site";
import type { PaletteCommand, PaletteCommandId } from "../content/site";

export type PaletteAction = { kind: "go"; path: string } | { kind: "ring" } | { kind: "audio" };

export interface PaletteEntry {
  command: PaletteCommand;
  action: PaletteAction;
}

function actionFor(id: PaletteCommandId): PaletteAction {
  if (id === "toggle-ring") return { kind: "ring" };
  if (id === "toggle-audio") return { kind: "audio" };
  const route = nav.find((item) => `go-${item.id}` === id);
  return { kind: "go", path: route?.path ?? "/" };
}

export const paletteEntries: PaletteEntry[] = palette.commands.map((command) => ({
  command,
  action: actionFor(command.id),
}));

/** Lowercase and strip diacritics, so "palantir" and "nazgul" both match. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function filterEntries(query: string, entries = paletteEntries): PaletteEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return entries.filter(({ command }) => {
    const haystack = fold([command.label, command.hint, ...command.keywords].join(" "));
    return words.every((word) => haystack.includes(word));
  });
}
