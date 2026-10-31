import { describe, expect, it } from "vitest";
import { legionCategories, legions } from "../../content/legions";
import { fileNumber, filterLegions, toggleCompare } from "./filter";
import { MARK_WIDTH, markHalf, markPath } from "./mark";

describe("legion filter", () => {
  it("returns every file for no category", () => {
    expect(filterLegions(legions, null)).toBe(legions);
  });

  it("returns only the category asked for, in archive order", () => {
    expect(filterLegions(legions, "Beasts").map((file) => file.id)).toEqual(["fell-beasts", "wargs"]);
    expect(filterLegions(legions, "Command").map((file) => file.id)).toEqual(["nazgul", "mouth-of-sauron", "gothmog"]);
  });

  it("files each dossier under exactly one category", () => {
    const counted = legionCategories.reduce((sum, category) => sum + filterLegions(legions, category).length, 0);
    expect(counted).toBe(legions.length);
  });

  it("returns nothing, not everything, when a category is empty", () => {
    expect(filterLegions([legions[0]!], "Trolls")).toEqual([]);
  });
});

describe("comparison", () => {
  it("marks, unmarks, and holds two with the oldest displaced", () => {
    expect(toggleCompare([], "a")).toEqual(["a"]);
    expect(toggleCompare(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleCompare(["a", "b"], "c")).toEqual(["b", "c"]);
    expect(toggleCompare(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("file numbers and marks", () => {
  it("numbers files from the archive, not the filter", () => {
    expect(fileNumber(legions, "gothmog")).toBe("DF-012");
  });

  it("draws a stable, distinct mark for every file", () => {
    const paths = legions.map((file) => markPath(file.id));
    expect(new Set(paths).size).toBe(legions.length);
    expect(markPath("gothmog")).toBe(paths[legions.length - 1]);
  });

  it("keeps each half on its own side of the spine, so the mark can only be mirrored", () => {
    for (const file of legions) {
      for (const polygon of markHalf(file.id)) {
        for (const [x] of polygon) {
          expect(x).toBeGreaterThan(MARK_WIDTH / 2);
          expect(x).toBeLessThanOrEqual(MARK_WIDTH);
        }
      }
    }
  });
});
