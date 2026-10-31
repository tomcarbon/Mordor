// @vitest-environment node
import { describe, expect, it } from "vitest";
import { eligibleObservations, levelFor, pickObservation } from "./meter";

describe("attention levels", () => {
  it.each([
    [0, "Unremarked"],
    [24.9, "Unremarked"],
    [25, "Noted"],
    [49.9, "Noted"],
    [50, "Of Interest"],
    [74.9, "Of Interest"],
    [75, "Under Regard"],
    [99.9, "Under Regard"],
    [100, "Found"],
  ])("at %d reads %s", (attention, label) => {
    expect(levelFor(attention).label).toBe(label);
  });
});

describe("observations", () => {
  it("offers ring lines only while the ring is on", () => {
    expect(eligibleObservations(true).some((o) => o.when === "ringOff")).toBe(false);
    expect(eligibleObservations(false).some((o) => o.when === "ringOn")).toBe(false);
  });

  it("never repeats the previous line", () => {
    const first = pickObservation(false, null, () => 0);
    expect(pickObservation(false, first.id, () => 0).id).not.toBe(first.id);
  });

  it("stays in range at the top of the random interval", () => {
    expect(pickObservation(true, null, () => 0.999999)).toBeDefined();
  });
});
