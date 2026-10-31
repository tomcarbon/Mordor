import { describe, expect, it } from "vitest";
import { chronicle } from "../../content/chronicle";
import { absoluteYear, formatYear, gapRem, heatAt, yearAt } from "./scale";

describe("the Chronicle's scale", () => {
  it("reads both ages and conventional dates on one count", () => {
    expect(absoluteYear("c. S.A. 1000")).toBe(1000);
    expect(absoluteYear("T.A. 1640")).toBe(5081);
    expect(absoluteYear("T.A. 3019, 25 March")).toBe(6460);
  });

  it("rejects a year it cannot read", () => {
    expect(() => absoluteYear("soon")).toThrow();
  });

  it("formats the count back into the proper age", () => {
    expect(formatYear(3441)).toBe("S.A. 3441");
    expect(formatYear(5081)).toBe("T.A. 1640");
  });

  it("runs oldest first, without going backwards", () => {
    const years = chronicle.map((entry) => absoluteYear(entry.year));
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(chronicle[chronicle.length - 1]!.title).toBe("Entry Withheld");
  });

  it("gives longer silences more room, and never no room", () => {
    expect(gapRem(1640)).toBeGreaterThan(gapRem(100));
    expect(gapRem(0)).toBeGreaterThan(0);
  });

  it("interpolates the readout between entries and stops at the last", () => {
    const year = yearAt(chronicle, 0, 0.5);
    expect(year).toBe(1300);
    expect(yearAt(chronicle, chronicle.length - 1, 0.7)).toBe(6460);
  });

  it("raises the heat through the descent and puts it out at the refusal", () => {
    expect(heatAt(-1, 0)).toBe(0);
    expect(heatAt(0.5, 0)).toBeLessThan(heatAt(1, 0));
    expect(heatAt(1, 0)).toBe(1);
    expect(heatAt(1, 1)).toBe(0);
  });
});
