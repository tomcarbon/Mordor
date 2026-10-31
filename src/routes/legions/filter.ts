import type { LegionCategory, LegionDossier, LegionRatings } from "../../content/legions";

export const RATING_KEYS: (keyof LegionRatings)[] = ["strength", "discipline", "loyalty", "dread"];

export function filterLegions(files: LegionDossier[], category: LegionCategory | null): LegionDossier[] {
  return category ? files.filter((file) => file.category === category) : files;
}

/** Comparison holds two files. A third displaces the one marked first. Marking again removes. */
export function toggleCompare(marked: string[], id: string): string[] {
  if (marked.includes(id)) return marked.filter((other) => other !== id);
  return [...marked, id].slice(-2);
}

export function fileNumber(files: LegionDossier[], id: string): string {
  return `DF-${String(files.findIndex((file) => file.id === id) + 1).padStart(3, "0")}`;
}
