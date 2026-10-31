import { describe, expect, it } from "vitest";
import { musterCopy, writ } from "../../content/muster";
import { fillTokens } from "./fillTokens";

describe("fillTokens", () => {
  it("fills every token in the Writ preamble", () => {
    const text = fillTokens(writ.preamble, { name: "Shagrat", station: "Warden of the Morannon" });
    expect(text).toContain("that Shagrat, having");
    expect(text).toContain("appointed Warden of the Morannon.");
    expect(text).not.toMatch(/[{}]/);
  });

  it("takes numbers", () => {
    expect(fillTokens(musterCopy.progressLabel, { current: 3, total: 7 })).toBe("Question 3 of 7");
  });

  it("does not re-read substituted values", () => {
    expect(fillTokens("{name} is {station}", { name: "{station}", station: "Clerk" })).toBe("{station} is Clerk");
  });

  it("treats replacement patterns in a name as plain text", () => {
    expect(fillTokens("<{name}>", { name: "$& $1 $`" })).toBe("<$& $1 $`>");
  });

  it("leaves unknown tokens visible and ignores inherited keys", () => {
    expect(fillTokens("{missing} {constructor}", {})).toBe("{missing} {constructor}");
  });
});
