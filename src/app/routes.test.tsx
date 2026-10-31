import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { footer, meta, nav, notFound, palette } from "../content/site";
import { takeover } from "../content/eye";
import { SiteStoreProvider } from "../state/context";
import { createSiteStore } from "../state/store";
import type { SiteStore } from "../state/store";
import { RouteTable } from "./App";
import { flipRing } from "./RingToggle";
import { Shell } from "./Shell";

function renderAt(path: string, store: SiteStore = createSiteStore(null)) {
  render(
    <SiteStoreProvider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Shell>
          <RouteTable />
        </Shell>
      </MemoryRouter>
    </SiteStoreProvider>,
  );
  return store;
}

describe("routes", () => {
  it.each(nav.map((item) => [item.path, item.id] as const))("renders %s", async (path, id) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(document.title).toBe(meta[id].title);
  });

  it.each([
    ["/atlas/", "atlas"],
    ["/ATLAS", "atlas"],
    ["/road/?seed=4242", "road"],
    ["/Road/", "road"],
    ["/%61tlas", "atlas"],
  ] as const)("titles %s as the router routed it", async (path, id) => {
    renderAt(path);
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(document.title).toBe(meta[id].title));
  });

  it("gives an unknown path the real 404", async () => {
    renderAt("/no-such-road");
    expect(await screen.findByRole("heading", { name: notFound.title })).toBeTruthy();
    expect(document.title).toBe(meta.notFound.title);
  });
});

describe("shell", () => {
  it("always shows the fan notice and privacy note", async () => {
    renderAt("/atlas");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText(footer.fanNotice)).toBeTruthy();
    expect(screen.getByText(footer.privacyNote)).toBeTruthy();
  });

  it("drives data-ring on html from the store", async () => {
    const store = renderAt("/atlas");
    await screen.findByRole("heading", { level: 1 });
    expect(document.documentElement.hasAttribute("data-ring")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /claim the ring/i }));
    expect(store.getSnapshot().ring).toBe(true);
    expect(document.documentElement.getAttribute("data-ring")).toBe("on");
  });

  it("opens the palette on Ctrl+K, navigates by keyboard, and closes on Escape", async () => {
    renderAt("/atlas");
    await screen.findByRole("heading", { level: 1 });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog", { name: palette.ariaLabel });
    const input = screen.getByRole("combobox");
    await waitFor(() => expect(document.activeElement).toBe(input));
    fireEvent.change(input, { target: { value: "legions" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(dialog.isConnected).toBe(false);
    await waitFor(() => expect(document.title).toBe(meta.legions.title));

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the takeover at 100 and resets when dismissed by keyboard", async () => {
    const store = createSiteStore(null);
    store.raiseAttention(100);
    renderAt("/atlas", store);
    const dialog = await screen.findByRole("alertdialog");
    const button = screen.getByRole("button", { name: takeover.dismissLabel });
    await waitFor(() => expect(document.activeElement).toBe(button));
    await act(async () => {
      fireEvent.keyDown(dialog, { key: "Escape" });
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    await waitFor(() => expect(store.getSnapshot().attention).toBe(0));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText(takeover.afterword, { selector: "[role=status]" })).toBeTruthy();
  });

  it.each(["/road", "/road/", "/ROAD", "/road/?seed=4242"])("holds the takeover back on %s", async (path) => {
    const store = createSiteStore(null);
    store.raiseAttention(100);
    renderAt(path, store);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("closes the palette by its control, and by a tap on the backdrop but not on the panel", async () => {
    renderAt("/atlas");
    await screen.findByRole("heading", { level: 1 });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Look away" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("combobox");
    fireEvent.pointerDown(input);
    fireEvent.click(input);
    fireEvent.pointerDown(input); // A drag from the panel ends on the backdrop: not a tap on it.
    fireEvent.click(dialog);
    expect(screen.getByRole("dialog")).toBe(dialog);
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("will not open the palette over the takeover", async () => {
    const store = createSiteStore(null);
    store.raiseAttention(100);
    renderAt("/atlas", store);
    await screen.findByRole("alertdialog");
    const chord = fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(chord).toBe(false); // Still claimed from the browser.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("gives way to the takeover if the palette is open when it comes, and stays shut after", async () => {
    const store = renderAt("/atlas");
    await screen.findByRole("heading", { level: 1 });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => store.raiseAttention(100));
    const dialog = await screen.findByRole("alertdialog");
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {
      fireEvent.keyDown(dialog, { key: "Escape" });
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves the Ring alone while a paused game holds it", () => {
    const store = createSiteStore(null);
    const message = vi.fn();
    store.setRingLocked(true);
    flipRing(store, message);
    expect(store.getSnapshot().ring).toBe(false);
    expect(message).not.toHaveBeenCalled();
    store.setRingLocked(false);
    flipRing(store, message);
    expect(store.getSnapshot().ring).toBe(true);
  });
});
