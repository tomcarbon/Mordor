// The Last Road, in real Chrome: loads, takes input, pauses, restarts, draws, stops cleanly, and ends.
import { gameOver, roadCopy, stages, victory } from "../../src/content/road.ts";

export default async function road({ viewports, open, check, shot, overflow }) {
  const [desktop, phone] = viewports;
  const SEED = "/#/road?seed=4242";
  const field = "[data-eye]";

  async function finish(visit) {
    const problems = await visit.close();
    if (problems.length) throw new Error(problems.join("; "));
  }

  const state = (page) => page.locator(field).getAttribute("data-state");
  const data = (page, name) => page.locator(field).getAttribute(`data-${name}`);

  async function begin(page) {
    await page.getByRole("button", { name: "Begin the exercise" }).click();
    await page.getByRole("button", { name: "Proceed", exact: true }).click();
    await page.locator(`${field}[data-state="playing"]`).waitFor();
  }

  async function beginByTouch(page) {
    await page.getByRole("button", { name: roadCopy.startLabel }).tap();
    await page.getByRole("button", { name: "Proceed", exact: true }).tap();
    await page.locator(`${field}[data-state="playing"]`).waitFor();
  }

  async function ticksAdvance(page, ms = 1500) {
    const before = Number(await data(page, "tick"));
    await page.waitForTimeout(ms);
    return Number(await data(page, "tick")) > before;
  }

  /** Mid-tone pixels on the canvas: a blank field has none. */
  async function painted(page) {
    return page.evaluate((selector) => {
      const canvas = document.querySelector(`${selector} canvas`);
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const seen = new Set();
      for (let i = 0; i < data.length; i += 4000) seen.add(`${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`);
      return seen.size;
    }, field);
  }

  /** Opens the pinned run, and always closes its context: a failed check must not leave one behind. */
  async function visiting(viewport, options, run) {
    const visit = await open(viewport, SEED, options);
    let problems = [];
    try {
      await run(visit.page);
    } finally {
      problems = await visit.close();
    }
    if (problems.length) throw new Error(problems.join("; "));
  }

  /**
   * The only reach past the page: edits the live World in RoadGame's `world` ref through React's fiber.
   * There is no test hook in production and four stages take minutes to walk under software rendering.
   * Everything after the edit is real: the loop, step(), the stage hand-over, the panels and storage.
   */
  async function setWorld(page, change) {
    const found = await page.evaluate(
      ({ selector, change }) => {
        const root = document.querySelector(selector);
        let fiber = root[Object.keys(root).find((key) => key.startsWith("__reactFiber$"))];
        for (; fiber; fiber = fiber.return) {
          for (let hook = fiber.memoizedState; hook && typeof hook === "object" && "next" in hook; hook = hook.next) {
            const ref = hook.memoizedState;
            const world = ref?.current;
            if (!world?.map || !world.player) continue;
            const { exit } = world.map;
            ref.current = change === "exit" ? { ...world, player: { ...world.player, x: exit.x, y: exit.y } } : { ...world, ...change };
            return true;
          }
        }
        return false;
      },
      { selector: field, change },
    );
    if (!found) throw new Error("World ref not found: has RoadGame's hook order changed?");
  }

  /** Walks out of every stage through the real hand-over, ending on the victory panel. */
  async function reachVictory(page) {
    for (let index = 0; index < stages.length - 1; index += 1) {
      await setWorld(page, "exit");
      await page.getByRole("heading", { level: 2, name: stages[index + 1].name }).waitFor({ timeout: 10000 });
      if ((await state(page)) !== "briefing") throw new Error(`stage ${index + 1} ended in ${await state(page)}`);
      await page.getByRole("button", { name: "Proceed", exact: true }).click();
      await page.locator(`${field}[data-state="playing"]`).waitFor();
    }
    await setWorld(page, "exit");
    await page.locator(`${field}[data-state="won"]`).waitFor({ timeout: 10000 });
  }

  /** What both ending panels promise. */
  async function assertEnding(page, { title, retry, best }) {
    await page.getByRole("heading", { level: 2, name: title }).waitFor();
    const panel = page.locator(`${field} [data-surface="decree"]`);
    const text = await panel.textContent(); // Not innerText: the best line is uppercased by CSS.
    if (!best.test(text)) throw new Error(`best line missing: ${text}`);
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    if (focused !== retry) throw new Error(`focus on ${focused}`);
    const status = await page.getByRole("status", { name: "Exercise status" }).textContent();
    if (status !== title) throw new Error(`announced: ${status}`);
    if (await page.locator("html").getAttribute("data-ring")) throw new Error("the Ring stayed on after the end");
    if (await ticksAdvance(page, 400)) throw new Error("ticks advanced after the end");
  }

  const storedBest = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("mordor.road.v1")));
  const storedKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((key) => key !== "mordor.attention.v1"));
  const attention = (page) => page.evaluate(() => localStorage.getItem("mordor.attention.v1"));

  await check("road game loads, moves, wears the Ring, pauses, restarts @ desktop", async () => {
    const visit = await open(desktop, SEED);
    const { page } = visit;
    await shot(page, "road-intro-desktop");
    await begin(page);
    if ((await painted(page)) < 8) throw new Error("canvas looks blank");

    const x = Number(await data(page, "x"));
    const y = Number(await data(page, "y"));
    await page.keyboard.down("KeyD");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(700);
    await page.keyboard.up("KeyD");
    await page.keyboard.up("KeyW");
    await page.waitForTimeout(150);
    const moved = Math.hypot(Number(await data(page, "x")) - x, Number(await data(page, "y")) - y);
    if (moved < 0.5) throw new Error(`did not move: ${moved}`);
    await shot(page, "road-play-desktop");

    await page.keyboard.press("Space");
    await page.locator('[data-testid="ring-state"]', { hasText: "Ring worn" }).waitFor();
    if ((await page.locator("html").getAttribute("data-ring")) !== "on") throw new Error("site ring not on");
    await page.waitForTimeout(1200);
    if (Number(await data(page, "burden")) <= 0) throw new Error("burden did not rise");
    await shot(page, "road-ring-desktop");
    await page.keyboard.press("Space");
    await page.locator('[data-testid="ring-state"]', { hasText: "Ring hidden" }).waitFor();

    await page.keyboard.press("Escape");
    await page.locator(`${field}[data-state="paused"]`).waitFor({ timeout: 3000 });
    if (await ticksAdvance(page)) throw new Error("ticks advanced while paused");
    await page.keyboard.press("Escape");
    await page.locator(`${field}[data-state="playing"]`).waitFor({ timeout: 3000 });
    if (!(await ticksAdvance(page))) throw new Error("ticks did not advance after resume");

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Restart the exercise" }).click();
    await page.getByRole("button", { name: "Proceed", exact: true }).waitFor();
    if ((await data(page, "tick")) !== "0") throw new Error("restart did not reset");
    await finish(visit);
  });

  await check("road pauses when the canvas loses focus, or the tab hides", async () => {
    const visit = await open(desktop, SEED);
    const { page } = visit;
    await begin(page);
    await page.keyboard.press("Control+k");
    await page.waitForFunction((s) => document.querySelector(s).dataset.state === "paused", field);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Resume the exercise" }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.locator(`${field}[data-state="paused"]`).waitFor({ timeout: 3000 });
    await finish(visit);
  });

  await check("road stops its loop on leaving the route", async () => {
    const visit = await open(desktop, SEED);
    const { page } = visit;
    await begin(page);
    await page.evaluate(() => {
      window.__frames = 0;
      const real = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        window.__frames += 1;
        return real(callback);
      };
    });
    await page.waitForTimeout(400);
    if ((await page.evaluate(() => window.__frames)) === 0) throw new Error("the counter saw no frames, so proves nothing");
    await page.evaluate(() => {
      window.location.hash = "#/no-such-road";
    });
    await page.locator("main h1").waitFor();
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => window.__frames);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__frames);
    if (after > before + 1) throw new Error(`frames still requested: ${after - before}`);
    await finish(visit);
  });

  await check("road plays by touch @ phone, with no overflow", async () => {
    const visit = await open(phone, SEED);
    const { page } = visit;
    await shot(page, "road-intro-phone");
    await page.getByRole("button", { name: "Begin the exercise" }).tap();
    await page.getByRole("button", { name: "Proceed", exact: true }).tap();
    await page.locator(`${field}[data-state="playing"]`).waitFor();
    const ring = page.getByRole("button", { name: "Ring hidden" });
    const pauseButton = page.getByRole("button", { name: "Suspend the exercise" });
    for (const control of [ring, pauseButton]) {
      const box = await control.boundingBox();
      if (!box || box.height < 44) throw new Error("touch target under 44px");
    }

    const stick = await page.locator(`${field} [aria-hidden="true"]:has(> div)`).first().boundingBox();
    const client = await page.context().newCDPSession(page);
    const cx = stick.x + stick.width / 2;
    const cy = stick.y + stick.height / 2;
    const x = Number(await data(page, "x"));
    const y = Number(await data(page, "y"));
    const touch = (type, points) => client.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await touch("touchStart", [{ x: cx, y: cy }]);
    await touch("touchMove", [{ x: cx + stick.width / 2, y: cy - stick.height / 2 }]);
    await page.waitForTimeout(700);
    await shot(page, "road-play-phone");
    await touch("touchEnd", []);
    await page.waitForTimeout(100);
    const moved = Math.hypot(Number(await data(page, "x")) - x, Number(await data(page, "y")) - y);
    if (moved < 0.5) throw new Error(`stick did not move the player: ${moved}`);
    if ((await state(page)) !== "playing") throw new Error("touching the stick paused the game");

    await ring.tap();
    await page.getByRole("button", { name: "Ring worn" }).waitFor();
    if ((await state(page)) !== "playing") throw new Error("the Ring button paused the game");
    await shot(page, "road-ring-phone");
    await page.getByRole("button", { name: "Ring worn" }).tap();
    await pauseButton.tap();
    await page.getByRole("button", { name: "Resume the exercise" }).waitFor();
    await shot(page, "road-pause-phone");
    const wide = await overflow(page);
    if (wide) throw new Error(`horizontal overflow: ${wide}`);
    await finish(visit);
  });

  await check("road honours reduced motion and stays playable", async () => {
    const visit = await open(desktop, SEED, { reducedMotion: "reduce" });
    const { page } = visit;
    await page.getByText(/beam still sweeps/).waitFor();
    if ((await state(page)) !== "intro" || (await data(page, "tick")) !== "0") throw new Error("the game started itself");
    await begin(page);
    if (!(await ticksAdvance(page))) throw new Error("game did not run");
    await page.keyboard.press("Escape");
    await page.locator(`${field}[data-state="paused"]`).waitFor({ timeout: 3000 });
    await shot(page, "road-reduced-desktop");
    await finish(visit);
  });

  await check("road keeps storage to its one key", async () => {
    const visit = await open(desktop, SEED);
    const { page } = visit;
    await begin(page);
    await page.waitForTimeout(200);
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => !key.startsWith("mordor.attention")));
    if (keys.some((key) => key !== "mordor.road.v1")) throw new Error(`stored: ${keys}`);
    await finish(visit);
  });

  await check("road HUD clears the fixed strip in play @ desktop", () =>
    visiting(desktop, {}, async (page) => {
      await begin(page);
      const measure = () =>
        page.evaluate((selector) => {
          const strip = document.querySelector("[data-strip]").getBoundingClientRect().bottom;
          const hud = document.querySelector(`${selector} [data-testid="ring-state"]`).closest("p").parentElement;
          return { strip, hud: hud.getBoundingClientRect().top };
        }, field);
      const before = await measure();
      await shot(page, "road-hud-desktop");
      const after = await measure();
      for (const { strip, hud } of [before, after]) {
        if (hud < strip) throw new Error(`HUD at ${hud}, under the strip to ${strip}`);
      }
    }),
  );

  await check("road stick, Ring and Pause all usable @ phone landscape 844x390", () =>
    visiting({ ...phone, name: "landscape", width: 844, height: 390 }, {}, async (page) => {
      await beginByTouch(page);
      const ring = page.getByRole("button", { name: "Ring hidden" });
      const pauseButton = page.getByRole("button", { name: "Suspend the exercise" });
      const stickBox = page.locator(`${field} [aria-hidden="true"]:has(> div)`).first();
      await page.waitForTimeout(100);
      const floor = await page.evaluate((selector) => {
        const hud = document.querySelector(`${selector} [data-testid="ring-state"]`).closest("p").parentElement;
        return Math.max(hud.getBoundingClientRect().bottom, document.querySelector("[data-strip]").getBoundingClientRect().bottom);
      }, field);
      const boxes = { ring: await ring.boundingBox(), pause: await pauseButton.boundingBox(), stick: await stickBox.boundingBox() };
      for (const [name, box] of Object.entries(boxes)) {
        if (!box || box.y < floor || box.y + box.height > 390) throw new Error(`${name} at ${JSON.stringify(box)}, usable from ${floor} to 390`);
        if (box.height < 44) throw new Error(`${name} under 44px`);
      }
      await shot(page, "road-play-landscape");

      if ((await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)) !== "hidden") throw new Error("page not held in play");
      const { stick } = boxes;
      const cx = stick.x + stick.width / 2;
      const cy = stick.y + stick.height / 2;
      const x = Number(await data(page, "x"));
      const y = Number(await data(page, "y"));
      const client = await page.context().newCDPSession(page);
      const touch = (type, points) => client.send("Input.dispatchTouchEvent", { type, touchPoints: points });
      await touch("touchStart", [{ x: cx, y: cy }]);
      await touch("touchMove", [{ x: cx + stick.width / 2, y: cy - stick.height / 2 }]);
      await page.waitForTimeout(700);
      await touch("touchEnd", []);
      await page.waitForTimeout(100);
      if (Math.hypot(Number(await data(page, "x")) - x, Number(await data(page, "y")) - y) < 0.5) throw new Error("stick did not move the player");

      await ring.tap();
      await page.getByRole("button", { name: "Ring worn" }).waitFor();
      await page.getByRole("button", { name: "Ring worn" }).tap();
      await pauseButton.tap();
      await page.getByRole("button", { name: "Resume the exercise" }).waitFor();
      const wide = await overflow(page);
      if (wide) throw new Error(`horizontal overflow: ${wide}`);
    }),
  );

  await check("road paused: the Ring holds by key and strip, Escape resumes from either, wheel and resume keep the HUD clear", () =>
    visiting(desktop, {}, async (page) => {
      await begin(page);
      const hudTop = () =>
        page.evaluate((selector) => document.querySelector(`${selector} [data-testid="ring-state"]`).closest("p").parentElement.getBoundingClientRect().top, field);
      const stripEnd = await page.evaluate(() => document.querySelector("[data-strip]").getBoundingClientRect().bottom);
      const worn = () => page.locator("html").getAttribute("data-ring");
      const box = await page.locator(`${field} canvas`).boundingBox();

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(150);
      if ((await hudTop()) < stripEnd) throw new Error("the wheel scrolled the HUD under the strip");

      const scrollY = () => page.evaluate(() => window.scrollY);
      const held = await scrollY();
      // clientWidth reads differently with a gutter: what matters is where things are.
      const layout = () =>
        page.evaluate((selector) => {
          const strip = document.querySelector("[data-strip]").getBoundingClientRect();
          const box = document.querySelector(selector).getBoundingClientRect();
          return [strip.left, strip.width, box.left, box.width].join();
        }, field);
      const width = await layout();
      for (const key of ["PageDown", "End", "PageUp", "Home", "ArrowDown", "ArrowUp", "Space", "Space"]) await page.keyboard.press(key);
      for (const [x, y] of [[4, 400], [700, 20]]) {
        await page.mouse.move(x, y);
        await page.mouse.wheel(0, 600);
      }
      await page.waitForTimeout(200);
      if ((await scrollY()) !== held) throw new Error(`the page scrolled in play: ${held} to ${await scrollY()}`);
      if (!(await ticksAdvance(page, 300))) throw new Error("ticks stopped");
      if ((await state(page)) !== "playing") throw new Error(`state ${await state(page)}`);

      // Tab hidden with focus left on the canvas.
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      });
      await page.locator(`${field}[data-state="paused"]`).waitFor({ timeout: 3000 });
      await page.keyboard.press("Space");
      if (await worn()) throw new Error("Space moved the Ring while paused");
      if ((await layout()) !== width) throw new Error(`layout shifted on pause: ${width} to ${await layout()}`);
      await page.mouse.wheel(0, 300);
      await page.waitForFunction((y) => window.scrollY !== y, held, { timeout: 3000 });
      // Straight after the wheel, so its smooth scroll is still running when play resumes.
      await page.keyboard.press("Escape");
      await page.locator(`${field}[data-state="playing"]`).waitFor({ timeout: 3000 });
      await page.waitForTimeout(600);
      if ((await hudTop()) < stripEnd) throw new Error("resume did not realign");

      // The strip's toggle: the press blurs the canvas and pauses; the click must not reach the Ring.
      await page.getByRole("button", { name: /claim the ring/i }).click();
      await page.locator(`${field}[data-state="paused"]`).waitFor({ timeout: 3000 });
      if (await worn()) throw new Error("the strip moved the Ring while paused");
      await page.keyboard.press("Escape");
      await page.locator(`${field}[data-state="playing"]`).waitFor({ timeout: 3000 });
      await page.getByRole("button", { name: /claim the ring/i }).waitFor();

      await page.evaluate(() => {
        window.location.hash = "#/no-such-road";
      });
      // The route's own h1 still answers until the next chunk lands, so wait on the release itself.
      await page.waitForFunction(() => getComputedStyle(document.documentElement).overflowY !== "hidden", null, { timeout: 5000 });
    }),
  );

  await check("road game over: panel, best run, storage, retry @ desktop", () =>
    visiting(desktop, {}, async (page) => {
      await begin(page);
      await page.keyboard.press("Space");
      await page.locator('[data-testid="ring-state"]', { hasText: "Ring worn" }).waitFor();
      await setWorld(page, { burden: 1 });
      await page.locator(`${field}[data-state="lost"]`).waitFor({ timeout: 30000 });
      await assertEnding(page, { title: gameOver.title, retry: gameOver.retryLabel, best: /Reached Cirith Ungol\./ });
      await shot(page, "road-lost-desktop");

      const run = await storedBest(page);
      if (run.won !== false || run.stage !== 1 || !(run.seconds > 0)) throw new Error(`stored ${JSON.stringify(run)}`);
      const keys = await storedKeys(page);
      if (keys.join() !== "mordor.road.v1") throw new Error(`stored keys: ${keys}`);

      await page.getByRole("button", { name: gameOver.retryLabel }).click();
      await page.getByRole("button", { name: "Proceed", exact: true }).waitFor();
      if ((await data(page, "tick")) !== "0") throw new Error("retry did not reset the run");
      if (Number(await data(page, "burden")) !== 0) throw new Error("retry kept the burden");
      await page.getByRole("button", { name: "Proceed", exact: true }).click();
      await page.locator(`${field}[data-state="playing"]`).waitFor();
      if (!(await ticksAdvance(page))) throw new Error("the retried run did not start");
    }),
  );

  // Unassisted: no World edit. At phone width, because at 1440 under software rendering, on a shared
  // machine, the worn Ring did not reach the end in 90 s.
  await check("road game over, earned: the Ring draws the Eye, attention stays, the exit leaves @ phone", () =>
    visiting(phone, {}, async (page) => {
      const before = await attention(page);
      await beginByTouch(page);
      await page.getByRole("button", { name: "Ring hidden" }).tap();
      await page
        .locator(`${field}[data-state="lost"]`)
        .waitFor({ timeout: 75000 })
        .catch(async () => {
          throw new Error(`not lost: state ${await state(page)}, tick ${await data(page, "tick")}, burden ${await data(page, "burden")}`);
        });
      await assertEnding(page, { title: gameOver.title, retry: gameOver.retryLabel, best: /Reached Cirith Ungol\./ });
      const line = await page.locator(`${field} [data-surface="decree"] h2 + p`).textContent();
      if (!gameOver.lines.includes(line)) throw new Error(`loss line not from the copy: ${line}`);
      if ((await attention(page)) !== before) throw new Error("the game raised attention");
      await shot(page, "road-lost-phone");
      const wide = await overflow(page);
      if (wide) throw new Error(`horizontal overflow: ${wide}`);
      await page.getByRole("link", { name: gameOver.exitLabel }).tap();
      await page.waitForFunction(() => location.hash === "#/");
    }),
  );

  await check("road victory through all four stages: panel, best run, retry @ desktop", () =>
    visiting(desktop, {}, async (page) => {
      await begin(page);
      await reachVictory(page);
      await assertEnding(page, { title: victory.title, retry: victory.retryLabel, best: /Completed in \d+:\d\d, burden \d+%\./ });
      const text = await page.locator(`${field} [data-surface="decree"]`).textContent();
      for (const line of [...victory.lines, victory.verdict]) {
        if (!text.includes(line)) throw new Error(`victory copy missing: ${line}`);
      }
      await shot(page, "road-won-desktop");

      const run = await storedBest(page);
      if (run.won !== true || run.stage !== stages.length) throw new Error(`stored ${JSON.stringify(run)}`);
      await page.getByRole("button", { name: victory.retryLabel }).click();
      await page.getByRole("heading", { level: 2, name: stages[0].name }).waitFor();
      if ((await data(page, "tick")) !== "0") throw new Error("retry did not reset the run");

      await page.reload();
      await page.getByRole("button", { name: roadCopy.startLabel }).waitFor();
      if (!/Completed in \d+:\d\d, burden \d+%\./.test(await page.locator(field).textContent())) {
        throw new Error("the best run did not survive a reload");
      }
    }),
  );

  await check("road victory fits @ phone, and the exit leaves", () =>
    visiting(phone, {}, async (page) => {
      await beginByTouch(page);
      await reachVictory(page);
      await assertEnding(page, { title: victory.title, retry: victory.retryLabel, best: /Completed in/ });
      await shot(page, "road-won-phone");
      const wide = await overflow(page);
      if (wide) throw new Error(`horizontal overflow: ${wide}`);
      await page.getByRole("link", { name: victory.exitLabel }).tap();
      await page.waitForFunction(() => location.hash === "#/");
    }),
  );
}
