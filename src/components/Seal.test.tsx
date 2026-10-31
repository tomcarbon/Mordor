import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import sigil from "../assets/sigil.svg?raw";
import { Seal } from "./Seal";
import source from "./Seal.tsx?raw";

function shape(node: Element): unknown {
  const attributes = Object.fromEntries(Array.from(node.attributes, ({ name, value }) => [name, value]));
  return [node.localName, attributes, Array.from(node.children, shape)];
}

describe("Seal", () => {
  it("renders the current asset exactly, as inline SVG, without React complaint", () => {
    const complaint = vi.spyOn(console, "error");
    const { container } = render(<Seal size={48} decorative />);
    const svg = container.querySelector("span > svg")!;
    const asset = new DOMParser().parseFromString(sigil, "image/svg+xml").documentElement;
    expect(shape(svg)).toEqual(shape(asset));
    expect(complaint).not.toHaveBeenCalled();
    complaint.mockRestore();
  });

  it("still draws in currentColor, and injects no markup", () => {
    const { container } = render(<Seal />);
    expect(container.querySelector('g[fill="currentColor"]')).toBeTruthy();
    expect(container.querySelector('g[stroke="currentColor"]')).toBeTruthy();
    expect(container.querySelectorAll("use").length).toBe(18);
    expect(source).not.toMatch(/dangerouslySetInner|\.innerHTML/);
  });
});
