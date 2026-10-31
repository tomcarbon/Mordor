import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hero, heroControl } from "../../content/threshold";
import { SiteStoreProvider } from "../../state/context";
import { createSiteStore } from "../../state/store";
import Threshold from "./index";

function mount(): void {
  render(
    <SiteStoreProvider store={createSiteStore(null)}>
      <MemoryRouter>
        <Threshold />
      </MemoryRouter>
    </SiteStoreProvider>,
  );
}

const active = (): string | null | undefined => document.querySelector("li[data-active]")?.textContent;

describe("hero lines", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rotates, holds on the control, and carries on when released (WCAG 2.2.2)", () => {
    mount();
    const advance = () => act(() => vi.advanceTimersByTime(7000));
    advance();
    expect(active()).toBe(hero.lines[1]);
    fireEvent.click(screen.getByRole("button", { name: heroControl.pause }));
    advance();
    advance();
    expect(active()).toBe(hero.lines[1]);
    fireEvent.click(screen.getByRole("button", { name: heroControl.resume }));
    advance();
    expect(active()).toBe(hero.lines[2]);
  });

  it("offers no control when the lines are already still", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined }));
    mount();
    expect(screen.queryByRole("button", { name: heroControl.pause })).toBeNull();
  });
});
