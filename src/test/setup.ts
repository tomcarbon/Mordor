import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Tests marked @vitest-environment node have no DOM to prepare.
if (typeof document !== "undefined") {
  // jsdom logs "not implemented" for canvas contexts; code under test feature-detects a null.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
  window.scrollTo = vi.fn() as never;

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-ring");
  });
}
