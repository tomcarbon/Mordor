import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { atlasCopy, places } from "../../content/atlas";
import { SiteStoreProvider } from "../../state/context";
import { createSiteStore } from "../../state/store";
import Atlas from "./index";
import { blob, buildSurvey } from "./terrain";
import {
  FIT_VIEW,
  MAX_ZOOM,
  centreOn,
  clampView,
  gridRef,
  nearestPlace,
  placeInDirection,
  placeLabels,
  project,
  reveal,
  zoomAt,
} from "./view";

const SIZE = 800;
const named = (id: string) => places.find((place) => place.id === id)!;

describe("the view", () => {
  it("keeps the sheet covering the stage", () => {
    expect(clampView({ k: 2, x: 50, y: -5000 }, SIZE)).toEqual({ k: 2, x: 0, y: -800 });
    expect(clampView({ k: 0.2, x: 0, y: 0 }, SIZE)).toEqual(FIT_VIEW);
    expect(clampView({ k: 99, x: 0, y: 0 }, SIZE).k).toBe(MAX_ZOOM);
  });

  it("keeps the ground under the pointer while zooming", () => {
    const before = project(named("orodruin"), FIT_VIEW, SIZE);
    const view = zoomAt(FIT_VIEW, 3, before.x, before.y, SIZE);
    const after = project(named("orodruin"), view, SIZE);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("centres a place, and reveals a place with the least movement", () => {
    const at = project(named("gorgoroth"), centreOn(named("gorgoroth"), 2.4, SIZE), SIZE);
    expect(at.x).toBeCloseTo(SIZE / 2);
    const view = centreOn(named("nurnen"), 4, SIZE);
    const shown = project(named("morannon"), reveal(named("morannon"), view, SIZE, 48), SIZE);
    expect(shown.x).toBeGreaterThanOrEqual(48);
    expect(shown.y).toBeGreaterThanOrEqual(48);
  });
});

describe("the grid and markers", () => {
  it("gives grid references, including at the sheet edge", () => {
    expect(gridRef(named("barad-dur"))).toBe("F3");
    expect(gridRef({ x: 1000, y: 1000 })).toBe("J10");
  });

  it("resolves a crowded tap to the nearest marker within reach", () => {
    const at = project(named("udun"), FIT_VIEW, 390);
    expect(nearestPlace(places, at.x + 2, at.y, FIT_VIEW, 390, 34)?.id).toBe("udun");
    expect(nearestPlace(places, 380, 10, FIT_VIEW, 390, 34)).toBeNull();
  });

  it("travels to a place in the arrow's direction, and stops at the edge", () => {
    expect(placeInDirection(places, named("barad-dur"), "down")?.id).toBe("gorgoroth");
    expect(placeInDirection(places, named("morannon"), "up")).toBeNull();
  });

  it("leaves off a label that would collide, but always keeps the selected one", () => {
    const request = (id: string, priority: number) => ({ id, text: "Morannon", at: { x: 100, y: 100 }, priority, offset: 14 });
    const both = [request("a", 1), request("b", 2), request("c", 3)];
    expect(placeLabels(both, 400, null).map((label) => label.side)).toEqual(["right", "left"]);
    expect(placeLabels(both, 400, "c")[0]).toEqual({ id: "c", side: "right" });
  });
});

describe("the linework", () => {
  it("is the same drawing every time", () => {
    expect(buildSurvey().coast).toBe(buildSurvey().coast);
    expect(buildSurvey().peaks.length).toBeGreaterThan(10);
  });

  it("closes outlines", () => {
    expect(blob({ x: 0, y: 0 }, 10, 10, 0, 1)).toHaveLength(96);
  });
});

describe("the route", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  function renderAt(path: string) {
    return render(
      <SiteStoreProvider store={createSiteStore(null)}>
        <MemoryRouter initialEntries={[path]}>
          <Atlas />
        </MemoryRouter>
      </SiteStoreProvider>,
    );
  }

  it("opens the dossier named in the address", () => {
    renderAt("/atlas?place=nurnen");
    const dossier = screen.getByRole("complementary", { name: "Sea of Núrnen" });
    expect(within(dossier).getByText(atlasCopy.dangerScale[0]!)).toBeTruthy();
  });

  it("ignores an address naming no such place", () => {
    renderAt("/atlas?place=rivendell");
    expect(screen.queryByRole("complementary", { name: /./ })).toBeNull();
  });

  it("offers every place as a button in the gazetteer and on the sheet, and opens from it", () => {
    renderAt("/atlas");
    expect(document.querySelectorAll("[data-place]")).toHaveLength(places.length);
    const list = screen.getByRole("heading", { name: /gazetteer/i }).parentElement!;
    fireEvent.click(within(list).getByRole("button", { name: /^Orodruin/ }));
    expect(screen.getByRole("complementary", { name: "Orodruin" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: atlasCopy.closeLabel }));
    expect(screen.queryByRole("complementary", { name: "Orodruin" })).toBeNull();
  });
});
