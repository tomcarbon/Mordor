import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HashRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { gameOver, instructions, roadCopy, stages } from "../../content/road";
import { SiteStoreProvider } from "../../state/context";
import { createSiteStore } from "../../state/store";
import { isBetter, readBest, recordRun } from "./best";
import Road from "./index";
import { pickLossLine } from "./lossLine";
import { RoadGame } from "./RoadGame";
import { reducedMotionNotice } from "./strings";

function mount(): ReturnType<typeof createSiteStore> {
  const store = createSiteStore(null);
  render(
    <SiteStoreProvider store={store}>
      <HashRouter>
        <Road />
      </HashRouter>
    </SiteStoreProvider>,
  );
  return store;
}

describe("road route", () => {
  it("offers the text alternative and every instruction, without a 2D context", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: roadCopy.title })).toBeTruthy();
    expect(screen.getByRole("application").getAttribute("aria-describedby")).toBe("road-description");
    for (const item of instructions) expect(screen.getAllByText(item.action).length).toBeGreaterThan(0);
  });

  it("begins at a briefing with the Ring taken off", () => {
    const store = mount();
    act(() => store.setRing(true));
    fireEvent.click(screen.getByRole("button", { name: roadCopy.startLabel }));
    expect(store.getSnapshot().ring).toBe(false);
    expect(screen.getByRole("heading", { level: 2, name: stages[0]!.name })).toBeTruthy();
  });

  it("does not raise attention in play, with the Ring on or off", async () => {
    const store = mount();
    fireEvent.click(screen.getByRole("button", { name: roadCopy.startLabel }));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    const field = document.querySelector<HTMLElement>("[data-eye]")!;
    const ticks = (): number => Number(field.dataset.tick);
    await waitFor(() => expect(ticks()).toBeGreaterThan(5), { timeout: 5000 });
    fireEvent.keyDown(screen.getByRole("application"), { code: "Space" });
    expect(store.getSnapshot().ring).toBe(true);
    const worn = ticks();
    await waitFor(() => expect(ticks()).toBeGreaterThan(worn + 5), { timeout: 5000 });
    expect(store.getSnapshot().attention).toBe(0);
  });
});

describe("road pause", () => {
  function play(): { store: ReturnType<typeof mount>; canvas: HTMLElement; field: HTMLElement } {
    const store = mount();
    fireEvent.click(screen.getByRole("button", { name: roadCopy.startLabel }));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    return { store, canvas: screen.getByRole("application"), field: document.querySelector<HTMLElement>("[data-eye]")! };
  }

  function hideTab(hidden: boolean): void {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  }

  it("after a tab-hide pause on the canvas: Space does nothing, Escape resumes and locks no more", () => {
    const { store, canvas, field } = play();
    expect(store.getSnapshot().ringLocked).toBe(false);
    hideTab(true);
    hideTab(false);
    expect(field.dataset.state).toBe("paused");
    expect(store.getSnapshot().ringLocked).toBe(true);
    fireEvent.keyDown(canvas, { code: "Space" });
    expect(store.getSnapshot().ring).toBe(false);
    fireEvent.keyDown(canvas, { code: "Escape", key: "Escape" });
    expect(field.dataset.state).toBe("playing");
    expect(store.getSnapshot().ringLocked).toBe(false);
  });

  it("resumes on Escape with focus outside the field, and realigns the field", () => {
    const { canvas, field } = play();
    const outside = document.body.appendChild(document.createElement("button"));
    hideTab(true);
    hideTab(false);
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.keyDown(outside, { key: "Escape" });
    outside.remove();
    expect(field.dataset.state).toBe("playing");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(canvas);
  });

  it("does not undo the pause that Escape on the canvas just made", () => {
    const { canvas, field } = play();
    fireEvent.keyDown(canvas, { code: "Escape", key: "Escape" });
    expect(field.dataset.state).toBe("paused");
  });

  it("holds the page only in play: on with play, off on pause, back on resume, off at a new run", () => {
    const locked = (): boolean => document.documentElement.hasAttribute("data-road-playing");
    const { canvas } = play();
    expect(locked()).toBe(true);
    fireEvent.keyDown(canvas, { code: "Escape", key: "Escape" });
    expect(locked()).toBe(false);
    fireEvent.keyDown(screen.getByRole("button", { name: roadCopy.resumeLabel }), { key: "Escape" });
    expect(locked()).toBe(true);
    fireEvent.keyDown(canvas, { code: "Escape", key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Restart the exercise" }));
    expect(locked()).toBe(false);
  });

  it("pulls back a scroll that arrives in play, and leaves one alone when paused", () => {
    const { canvas } = play();
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.scroll(window);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(canvas, { code: "Escape", key: "Escape" });
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.scroll(window);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("leaves page and Dialog's inline overflow alone", () => {
    const { canvas } = play();
    expect(document.documentElement.style.overflow).toBe("");
    fireEvent.keyDown(canvas, { code: "Escape", key: "Escape" });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("releases the Ring lock on leaving the route while paused", () => {
    const store = createSiteStore(null);
    const view = render(
      <SiteStoreProvider store={store}>
        <HashRouter>
          <Road />
        </HashRouter>
      </SiteStoreProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: roadCopy.startLabel }));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    fireEvent.keyDown(screen.getByRole("application"), { code: "Escape", key: "Escape" });
    expect(store.getSnapshot().ringLocked).toBe(true);
    view.unmount();
    expect(store.getSnapshot().ringLocked).toBe(false);
  });

  it("releases the page on leaving the route in play", () => {
    const view = render(
      <SiteStoreProvider store={createSiteStore(null)}>
        <HashRouter>
          <Road />
        </HashRouter>
      </SiteStoreProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: roadCopy.startLabel }));
    fireEvent.click(screen.getByRole("button", { name: "Proceed" }));
    expect(document.documentElement.hasAttribute("data-road-playing")).toBe(true);
    view.unmount();
    expect(document.documentElement.hasAttribute("data-road-playing")).toBe(false);
  });
});

describe("reduced motion", () => {
  function mountGame(reduced: boolean): void {
    render(
      <SiteStoreProvider store={createSiteStore(null)}>
        <HashRouter>
          <RoadGame reducedMotion={reduced} />
        </HashRouter>
      </SiteStoreProvider>,
    );
  }

  it("says the beam still sweeps before Start, and waits there", () => {
    mountGame(true);
    expect(screen.getByText(reducedMotionNotice)).toBeTruthy();
    expect(screen.getByRole("button", { name: roadCopy.startLabel })).toBeTruthy();
    expect(document.querySelector<HTMLElement>("[data-eye]")!.dataset.state).toBe("intro");
  });

  it("stays quiet without the preference", () => {
    mountGame(false);
    expect(screen.queryByText(reducedMotionNotice)).toBeNull();
  });
});

describe("best run", () => {
  const run = { won: false, stage: 2, seconds: 100, burden: 20 };

  it("prefers a win, then the further stage, then the quicker win", () => {
    expect(isBetter(run, null)).toBe(true);
    expect(isBetter({ ...run, stage: 3 }, run)).toBe(true);
    expect(isBetter({ ...run, stage: 1 }, run)).toBe(false);
    const win = { ...run, won: true, stage: 4 };
    expect(isBetter(win, { ...run, stage: 4 })).toBe(true);
    expect(isBetter({ ...win, seconds: 90 }, win)).toBe(true);
    expect(isBetter({ ...win, seconds: 110 }, win)).toBe(false);
  });

  it("stores under the one permitted key, and survives bad data", () => {
    recordRun(run);
    expect(window.localStorage.getItem("mordor.road.v1")).toBeTruthy();
    expect(window.localStorage.length).toBe(1);
    window.localStorage.setItem("mordor.road.v1", "{broken");
    expect(readBest()).toBeNull();
    window.localStorage.setItem("mordor.road.v1", '{"won":"yes"}');
    expect(readBest()).toBeNull();
  });
});

describe("best run validation", () => {
  const good = { won: true, stage: 4, seconds: 0, burden: 100 };

  it("accepts the bounds", () => {
    window.localStorage.setItem("mordor.road.v1", JSON.stringify(good));
    expect(readBest()).toEqual(good);
    window.localStorage.setItem("mordor.road.v1", JSON.stringify({ ...good, seconds: 86400 }));
    expect(readBest()).not.toBeNull();
    window.localStorage.setItem("mordor.road.v1", JSON.stringify({ ...good, stage: 1, burden: 0 }));
    expect(readBest()).not.toBeNull();
  });

  it.each([
    ["stage 0", { ...good, stage: 0 }],
    ["stage 5", { ...good, stage: 5 }],
    ["stage 1.5", { ...good, stage: 1.5 }],
    ["stage as text", { ...good, stage: "2" }],
    ["negative seconds", { ...good, seconds: -1 }],
    ["seconds as null", { ...good, seconds: null }],
    ["seconds past the bound", { ...good, seconds: 86401 }],
    ["absurd seconds", { ...good, seconds: 1e308 }],
    ["burden over", { ...good, burden: 101 }],
    ["burden under", { ...good, burden: -1 }],
    ["won as number", { ...good, won: 1 }],
    ["a missing field", { won: true, stage: 1, seconds: 1 }],
    ["an extra field", { ...good, name: "Frodo" }],
    ["an array", [true, 1, 1, 1]],
    ["null", null],
    ["a number", 7],
  ])("rejects %s", (_label, value) => {
    window.localStorage.setItem("mordor.road.v1", JSON.stringify(value));
    expect(readBest()).toBeNull();
  });
});

describe("loss lines", () => {
  it("draws from the copy, and only blames the Ring for a burden", () => {
    for (const cause of ["eye", "patrol", "spider", "burden"] as const) {
      for (let r = 0; r < 1; r += 0.05) {
        const line = pickLossLine(cause, () => r);
        expect(gameOver.lines).toContain(line);
        if (cause !== "burden") expect(line).not.toBe(gameOver.lines[5]);
      }
    }
  });
});
