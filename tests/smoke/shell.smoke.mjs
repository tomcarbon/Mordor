// Global systems, in real Chrome: chunk isolation, palette, ring, takeover, and the Eye's fallbacks.
export default async function shell({ viewports, open, check, shot, overflow }) {
  const [desktop, phone] = viewports;

  async function finish(visit) {
    const problems = await visit.close();
    if (problems.length) throw new Error(problems.join("; "));
  }

  await check("routes the router accepts are titled, and hold the takeover, as it does", async () => {
    const hold = { initScript: () => localStorage.setItem("mordor.attention.v1", "100") };
    for (const hash of ["/#/road/?seed=4242", "/#/ROAD"]) {
      const visit = await open(desktop, hash, hold);
      await visit.page.waitForTimeout(300);
      if ((await visit.page.title()) !== "The Last Road | The Black Land") throw new Error(`${hash}: ${await visit.page.title()}`);
      if (await visit.page.getByRole("alertdialog").count()) throw new Error(`${hash}: takeover over the game`);
      await finish(visit);
    }
    for (const hash of ["/#/atlas/", "/#/ATLAS"]) {
      const visit = await open(desktop, hash);
      if ((await visit.page.title()) !== "Atlas of the Land | The Black Land") throw new Error(`${hash}: ${await visit.page.title()}`);
      await finish(visit);
    }
  });

  await check("atlas does not fetch threshold or road chunks", async () => {
    const visit = await open(desktop, "/#/atlas");
    await visit.page.waitForLoadState("networkidle");
    const scripts = await visit.page.evaluate(() =>
      performance.getEntriesByType("resource").map((entry) => entry.name),
    );
    const leaked = scripts.filter((url) => /route-(threshold|road)-/.test(url));
    if (!scripts.some((url) => /route-atlas-/.test(url))) throw new Error("named route chunks not found");
    if (leaked.length) throw new Error(`leaked: ${leaked.join(", ")}`);
    await finish(visit);
  });

  await check("threshold runs WebGL and tracks without errors", async () => {
    const visit = await open(desktop, "/#/");
    const canvas = visit.page.locator("main canvas");
    await canvas.waitFor();
    await visit.page.mouse.move(100, 100);
    await visit.page.waitForTimeout(300);
    await finish(visit);
  });

  await check("reduced motion shows the static Eye and stacked lines", async () => {
    const visit = await open(desktop, "/#/", { reducedMotion: "reduce" });
    if (await visit.page.locator("main canvas").count()) throw new Error("canvas present");
    await visit.page.locator("main [data-eye] svg").waitFor();
    await shot(visit.page, "threshold-reduced-desktop");
    await finish(visit);
  });

  await check("no WebGL falls back to the static Eye", async () => {
    const visit = await open(phone, "/#/", {
      initScript: () => {
        HTMLCanvasElement.prototype.getContext = () => null;
      },
    });
    await visit.page.locator("main [data-eye] svg").waitFor();
    await shot(visit.page, "threshold-nogl-phone");
    await finish(visit);
  });

  await check("palette: keyboard open, filter, go, focus returns to page", async () => {
    const visit = await open(desktop, "/#/atlas");
    const { page } = visit;
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").waitFor();
    await shot(page, "palette-desktop");
    await page.keyboard.type("chron");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash === "#/chronicle");
    await page.keyboard.press("Control+k");
    await page.keyboard.press("Escape");
    if (await page.getByRole("dialog").count()) throw new Error("dialog stayed open");
    await finish(visit);
  });

  await check("palette closes by touch: control, then backdrop @ phone", async () => {
    const visit = await open(phone, "/#/atlas");
    const { page } = visit;
    const stone = page.getByRole("button", { name: /Ctrl K or Cmd K/ });
    await stone.tap();
    const close = page.getByRole("button", { name: "Look away" });
    const box = await close.boundingBox();
    if (!box || box.height < 44 || box.y < 0 || box.y + box.height > phone.height) throw new Error(`close control at ${JSON.stringify(box)}`);
    await shot(page, "palette-phone");
    await close.tap();
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 3000 });
    await stone.tap();
    await page.getByRole("combobox").waitFor();
    // Above the panel: the list runs to the foot of the screen, and a tap there would pick a command.
    await page.touchscreen.tap(phone.width / 2, 40);
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 3000 });
    if (await page.evaluate(() => location.hash) !== "#/atlas") throw new Error("the tap chose a command");
    await finish(visit);
  });

  await check("seal renders inline in currentColor, and the hero lines can be held", async () => {
    const visit = await open(desktop, "/#/");
    const { page } = visit;
    await page.getByRole("button", { name: "Suspend the announcements" }).click();
    await page.getByRole("button", { name: "Resume the announcements" }).waitFor();
    const seal = page.locator("main article svg").first();
    await seal.waitFor();
    const colours = await seal.evaluate((svg) => ({
      seal: getComputedStyle(svg.parentElement).color,
      blade: getComputedStyle(svg.querySelector("use")).fill,
      width: svg.getBoundingClientRect().width,
      teeth: svg.querySelector("circle").getAttribute("transform"),
    }));
    if (colours.seal !== colours.blade || !colours.width) throw new Error(JSON.stringify(colours));
    await finish(visit);
  });

  await check("ring: data-ring toggles and text states it", async () => {
    for (const viewport of viewports) {
      const visit = await open(viewport, "/#/atlas");
      const { page } = visit;
      await page.getByRole("button", { name: /claim the ring/i }).click();
      const ring = await page.evaluate(() => document.documentElement.getAttribute("data-ring"));
      if (ring !== "on") throw new Error(`data-ring=${ring}`);
      await page.getByRole("button", { name: /release the ring/i }).waitFor();
      const wide = await overflow(page);
      if (wide) throw new Error(`overflow with ring: ${wide}`);
      await finish(visit);
    }
  });

  await check("audio: no AudioContext before opt-in, one after", async () => {
    const visit = await open(desktop, "/#/atlas");
    const { page } = visit;
    await page.evaluate(() => {
      const Real = window.AudioContext;
      window.__contexts = 0;
      window.AudioContext = class extends Real {
        constructor(...args) {
          super(...args);
          window.__contexts += 1;
        }
      };
    });
    if ((await page.evaluate(() => window.__contexts)) !== 0) throw new Error("context before opt-in");
    await page.getByRole("button", { name: /let the land be heard/i }).click();
    if ((await page.evaluate(() => window.__contexts)) !== 1) throw new Error("no context after opt-in");
    await page.getByRole("button", { name: /silence the land/i }).click();
    await finish(visit);
  });

  await check("takeover: found at 100, Escape dismisses, meter resets, focus back", async () => {
    const visit = await open(desktop, "/#/atlas", {
      initScript: () => localStorage.setItem("mordor.attention.v1", "100"),
    });
    const { page } = visit;
    const dialog = page.getByRole("alertdialog");
    await dialog.waitFor();
    await page.waitForTimeout(1800);
    await shot(page, "takeover-desktop");
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(100);
    if (await page.getByRole("dialog").count()) throw new Error("the palette opened behind the takeover");
    if (!(await page.evaluate(() => document.getElementById("root").inert))) throw new Error("page not inert under the takeover");
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    if (focused !== "Lower your eyes") throw new Error(`focus on ${focused}`);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: 4000 });
    const stored = await page.evaluate(() => Number(localStorage.getItem("mordor.attention.v1")));
    if (stored > 1) throw new Error(`attention ${stored}`);
    await finish(visit);
  });
}
