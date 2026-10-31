import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { footer, site } from "../content/site";
import App from "./App";

vi.mock("./Shell", () => ({
  Shell(): never {
    throw new Error("broken");
  },
}));

describe("top-level error boundary", () => {
  it("shows the calm fallback, the fan notice and a way out, and drops the Ring's dye", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    document.documentElement.setAttribute("data-ring", "on");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: site.errorFallback.heading })).toBeTruthy();
    expect(screen.getByText(site.errorFallback.line)).toBeTruthy();
    expect(screen.getByText(footer.fanNotice)).toBeTruthy();
    expect(screen.getByRole("link", { name: site.errorFallback.returnLabel }).getAttribute("href")).toBe("./");
    expect(document.documentElement.hasAttribute("data-ring")).toBe(false);
    quiet.mockRestore();
  });
});
