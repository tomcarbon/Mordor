// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nav } from "../content/site";
import { filterEntries, paletteEntries } from "./palette-entries";

describe("palette entries", () => {
  it("maps every route in the nav", () => {
    const paths = paletteEntries.flatMap((e) => (e.action.kind === "go" ? [e.action.path] : []));
    expect(paths.sort()).toEqual(nav.map((item) => item.path).sort());
  });

  it("matches label, keyword and diacritic-free queries", () => {
    expect(filterEntries("atlas")[0]?.command.id).toBe("go-atlas");
    expect(filterEntries("barad-dur")[0]?.command.id).toBe("go-atlas");
    expect(filterEntries("mute")[0]?.command.id).toBe("toggle-audio");
  });

  it("returns everything for an empty query and nothing for nonsense", () => {
    expect(filterEntries("  ")).toHaveLength(paletteEntries.length);
    expect(filterEntries("xyzzy")).toHaveLength(0);
  });
});
