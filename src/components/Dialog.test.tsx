import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog page lock", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.body.appendChild(document.createElement("div"));
    root.id = "root";
  });

  afterEach(() => root.remove());

  const open = (label: string) =>
    render(
      <Dialog label={label} onDismiss={vi.fn()}>
        <button type="button">{label}</button>
      </Dialog>,
    );

  it("holds inert and scroll until the last of a stack closes, whichever closes first", () => {
    document.documentElement.style.overflow = "scroll";
    const under = open("under");
    const over = open("over");
    under.unmount();
    expect(root.inert).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");
    over.unmount();
    expect(root.inert).toBe(false);
    expect(document.documentElement.style.overflow).toBe("scroll");
    document.documentElement.style.overflow = "";
  });
});
