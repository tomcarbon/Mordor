import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { musterCopy, questions, stations, writ } from "../../content/muster";
import type { MusterQuestion, Station } from "../../content/muster";
import { SiteStoreProvider } from "../../state/context";
import { createSiteStore } from "../../state/store";
import Muster from "./index";
import { determineStation, tally } from "./scoring";
import type { Answers } from "./scoring";
import { wrapLines, writText } from "./writCanvas";

const answersFor = (ids: string[]): Answers =>
  Object.fromEntries(ids.map((id) => [id.split("-")[0]!, id]));

describe("scoring", () => {
  it("sums the scores of each chosen answer, including secondary scores", () => {
    const totals = tally(questions, answersFor(["order-improve", "quarters-window", "gaze-still"]));
    expect(totals).toEqual({ artificer: 2, clerk: 1, warden: 2, scout: 2, keeper: 2 });
  });

  it("gives the highest total", () => {
    const answers = answersFor(["stranger-form", "sound-pen", "order-improve", "fear-error", "reward-archive"]);
    expect(determineStation(stations, questions, answers).id).toBe("clerk");
  });

  it("breaks a two-way tie to the station earliest in the list", () => {
    const answers = answersFor(["stranger-follow", "sound-wind", "order-beast", "quarters-pens"]);
    expect(tally(questions, answers)).toEqual({ scout: 4, keeper: 4 });
    expect(determineStation(stations, questions, answers).id).toBe("scout");
  });

  it("applies the tie rule to list order, not to the order of answering or of the object", () => {
    const fixtureStations: Station[] = [...stations].reverse();
    const answers = answersFor(["stranger-follow", "sound-wind", "order-beast", "quarters-pens"]);
    expect(determineStation(fixtureStations, questions, answers).id).toBe("keeper");
  });

  it("gives the first station when nothing has scored", () => {
    expect(determineStation(stations, questions, {}).id).toBe(stations[0]!.id);
  });

  // The comment in content/muster.ts says every maximum is 10. Clerk and scout are 9: reported to
  // WO-0001.2. What the tie rule depends on, reachability, holds.
  it("reaches every station across all 16,384 paths", () => {
    const reached = new Set<string>();
    const best = new Map<string, number>();
    const walk = (index: number, answers: Answers, list: MusterQuestion[]): void => {
      const question = list[index];
      if (!question) {
        reached.add(determineStation(stations, list, answers).id);
        for (const [id, total] of Object.entries(tally(list, answers))) {
          best.set(id, Math.max(best.get(id) ?? 0, total));
        }
        return;
      }
      for (const answer of question.answers) walk(index + 1, { ...answers, [question.id]: answer.id }, list);
    };
    walk(0, {}, questions);
    expect([...reached].sort()).toEqual(stations.map((station) => station.id).sort());
    expect(Object.fromEntries(best)).toEqual({ warden: 10, herald: 10, clerk: 9, artificer: 10, scout: 9, keeper: 10 });
  });
});

describe("the Writ's text", () => {
  const station = stations[0]!;

  it("uses the fallback for an empty or blank name", () => {
    expect(writText("   ", station).name).toBe(writ.fallbackName);
  });

  it("carries the name literally", () => {
    expect(writText("{station}", station).preamble).toContain("that {station}, having");
  });

  it("wraps on words and breaks a word too long for any line", () => {
    const measure = (text: string) => text.length;
    expect(wrapLines("one two three four", 9, measure)).toEqual(["one two", "three", "four"]);
    expect(wrapLines("abcdefghijkl mn", 5, measure)).toEqual(["abcde", "fghij", "kl mn"]);
    expect(wrapLines("", 5, measure)).toEqual([]);
  });
});

describe("the Muster Office", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("issues a Writ by keyboard, and the name goes nowhere", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const store = createSiteStore(null);
    render(
      <SiteStoreProvider store={store}>
        <MemoryRouter>
          <Muster />
        </MemoryRouter>
      </SiteStoreProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: musterCopy.beginLabel }));
    for (let i = 0; i < questions.length; i += 1) {
      expect(screen.getAllByRole("radio")).toHaveLength(4);
      const form = screen.getAllByRole("radio")[0]!.closest("form")!;
      fireEvent.keyDown(form, { key: "1" });
      fireEvent.click(screen.getByRole("button", { name: musterCopy.nextLabel }));
    }
    expect(store.getSnapshot().attention).toBeGreaterThan(0);
    const field = screen.getByLabelText(musterCopy.nameLabel);
    expect(field.getAttribute("autocomplete")).toBe("off");
    expect(field.getAttribute("spellcheck")).toBe("false");
    act(() => {
      fireEvent.change(field, { target: { value: "Grishnakh Unique" } });
    });
    expect(screen.getByRole("article").textContent).toContain("Grishnakh Unique");
    expect(setItem.mock.calls.flat().join(" ")).not.toContain("Grishnakh");
    expect(JSON.stringify(store.getSnapshot())).not.toContain("Grishnakh");
    expect(window.location.href).not.toContain("Grishnakh");
    setItem.mockRestore();
  });
});
