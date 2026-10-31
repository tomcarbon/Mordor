// Atlas, Legions, Chronicle and Muster in real Chrome: the behaviour the route sweep cannot see.
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NAME = "Zzyzx Ñandú";
const PNG_SIGNATURE = "89504e470d0a1a0a";

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

export default async function contentRoutes({ viewports, open, check, shot, overflow }) {
  const [desktop, phone] = viewports;

  async function finish(visit) {
    const problems = await visit.close();
    if (problems.length) throw new Error(problems.join("; "));
  }

  const focusedPlace = (page) => page.evaluate(() => document.activeElement?.dataset?.place ?? null);
  const zoom = (page) => page.getByTestId("survey-stage").getAttribute("data-zoom").then(Number);
  const plate = (page) =>
    page.getByTestId("survey-stage").evaluate((stage) => stage.firstElementChild.style.transform);

  await check("atlas: keyboard travels, opens, deep-links, closes, zooms", async () => {
    const visit = await open(desktop, "/#/atlas");
    const { page } = visit;
    await page.getByTestId("survey-stage").focus();
    await page.keyboard.press("Tab");
    expect((await focusedPlace(page)) === "barad-dur", "Tab did not reach the first marker");
    await page.keyboard.press("ArrowDown");
    expect((await focusedPlace(page)) === "gorgoroth", "arrow did not travel to Gorgoroth");
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { level: 2, name: "Gorgoroth" }).waitFor();
    expect(page.url().includes("place=gorgoroth"), `url ${page.url()}`);
    const heading = await page.evaluate(() => document.activeElement?.tagName);
    expect(heading === "H2", `focus on ${heading}`);
    await page.keyboard.press("Escape");
    await page.getByRole("heading", { level: 2, name: "Gorgoroth" }).waitFor({ state: "detached" });
    expect(!page.url().includes("place="), "place stayed in url");
    expect((await focusedPlace(page)) === "gorgoroth", "focus did not return to the marker");

    await page.getByTestId("survey-stage").focus();
    const start = await zoom(page);
    await page.keyboard.press("+");
    await page.waitForTimeout(700);
    expect((await zoom(page)) > start, "+ did not zoom");
    const panned = await plate(page);
    await page.keyboard.press("ArrowLeft");
    expect((await plate(page)) !== panned, "arrow did not pan the stage");
    await page.keyboard.press("0");
    await page.waitForTimeout(700);
    expect((await zoom(page)) === 1, "0 did not restore");
    await finish(visit);
  });

  await check("atlas: mouse drag pans and the wheel zooms; a drag opens nothing", async () => {
    const visit = await open(desktop, "/#/atlas");
    const { page } = visit;
    const stage = page.getByTestId("survey-stage");
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(100);
    expect((await zoom(page)) > 2, "wheel did not zoom");
    const before = await plate(page);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 60, { steps: 6 });
    await page.mouse.up();
    expect((await plate(page)) !== before, "drag did not pan");
    expect(!page.url().includes("place="), "drag opened a dossier");
    await finish(visit);
  });

  await check("atlas: deep link opens the dossier at both widths; a bad id does not", async () => {
    for (const viewport of viewports) {
      const visit = await open(viewport, "/#/atlas?place=nurnen");
      const { page } = visit;
      await page.getByRole("heading", { level: 2, name: "Sea of Núrnen" }).waitFor();
      expect((await zoom(page)) > 2, "did not pull in on the place");
      const top = await page.getByTestId("survey-stage").evaluate((el) => el.getBoundingClientRect().top);
      expect(top < 200, `sheet not brought into view: ${top}`);
      const wide = await overflow(page);
      expect(!wide, `overflow ${wide}`);
      await page.waitForTimeout(600);
      await shot(page, `atlas-deeplink-${viewport.name}`);
      await finish(visit);
    }
    const visit = await open(desktop, "/#/atlas?place=rivendell");
    expect((await visit.page.getByRole("complementary", { name: /./ }).count()) === 0, "bad id opened something");
    await finish(visit);
  });

  await check("atlas: pinch zooms and a tap opens the nearest marker at 390px", async () => {
    const visit = await open(phone, "/#/atlas");
    const { page } = visit;
    const stage = page.getByTestId("survey-stage");
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, spread) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [
          { x: cx - spread, y: cy, id: 0 },
          { x: cx + spread, y: cy, id: 1 },
        ],
      });
    await touch("touchStart", 30);
    for (const spread of [45, 60, 80, 100, 120]) {
      await touch("touchMove", spread);
      await page.waitForTimeout(20);
    }
    await touch("touchEnd", 0);
    await page.waitForTimeout(100);
    expect((await zoom(page)) > 2, `pinch left zoom at ${await zoom(page)}`);
    await page.getByRole("button", { name: "Restore the survey" }).click();
    await page.waitForTimeout(700);
    await page.locator('[data-place="udun"]').tap({ force: true });
    await page.getByRole("heading", { level: 2, name: /Udûn|Durthang|Morannon|Isenmouthe/ }).waitFor();
    await finish(visit);
  });

  await check("atlas: the gazetteer is a working text alternative", async () => {
    const visit = await open(phone, "/#/atlas");
    const { page } = visit;
    await page.getByRole("button", { name: "Morgai, Ridge. Danger 3 of 5: Severe", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Morgai" }).waitFor();
    expect(page.url().includes("place=morgai"), "gazetteer did not address the place");
    await finish(visit);
  });

  await check("legions: filter narrows, compare sets two side by side", async () => {
    for (const viewport of viewports) {
      const visit = await open(viewport, "/#/legions");
      const { page } = visit;
      await page.getByRole("button", { name: /^Beasts/ }).click();
      expect((await page.getByRole("button", { name: /^Compare / }).count()) === 2, "filter did not narrow");
      await page.getByRole("button", { name: /^All files/ }).click();
      await page.getByRole("button", { name: "Compare Gothmog" }).click();
      await page.getByRole("button", { name: "Compare Shelob" }).click();
      await page.getByRole("heading", { name: "Comparative return" }).waitFor();
      const sides = await page.locator('[data-side]').evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top));
      expect(sides.length === 2 && Math.abs(sides[0] - sides[1]) < 2, "files are not side by side");
      const wide = await overflow(page);
      expect(!wide, `overflow ${wide}`);
      await page.waitForTimeout(600);
      await shot(page, `legions-compare-${viewport.name}`);
      await finish(visit);
    }
  });

  await check("chronicle: descends to the refusal and the closing line, both motion settings", async () => {
    for (const options of [{}, { reducedMotion: "reduce" }]) {
      const visit = await open(desktop, "/#/chronicle", options);
      const { page } = visit;
      const refusal = page.getByRole("heading", { name: "Entry Withheld" });
      await refusal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      const closing = page.getByText("The record is closed. This office remains open.");
      await closing.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const heat = await page.evaluate(() =>
        Number(document.querySelector('[class*="heat"]').style.getPropertyValue("--heat")),
      );
      expect(heat === 0, `the fire is still lit at the end: ${heat}`);
      // Entries a jump skipped stay armed until reached; any entry reached must finish landing.
      await page.waitForFunction(
        () => [...document.querySelectorAll("[data-entry][data-seen]")].every((n) => Number(getComputedStyle(n).opacity) === 1),
        undefined,
        { timeout: 5000 },
      );
      await shot(page, `chronicle-end${options.reducedMotion ? "-reduced" : ""}`);
      await finish(visit);
    }
  });

  await check("muster: keyboard completion, Writ PNG, and the name stays on the page", async () => {
    const visit = await open(desktop, "/#/muster");
    const { page } = visit;
    const requests = [];
    page.on("request", (request) => requests.push(request.url() + (request.postData() ?? "")));
    await page.getByRole("button", { name: "Report for assessment" }).focus();
    await page.keyboard.press("Enter");
    for (let i = 0; i < 7; i += 1) {
      await page.getByText(`Question ${i + 1} of 7`).waitFor();
      if (i % 2) {
        await page.keyboard.press("3");
      } else {
        await page.keyboard.press("ArrowDown");
      }
      await page.keyboard.press("Enter");
    }
    await page.getByRole("heading", { level: 2, name: /of|the/ }).waitFor();
    await page.getByLabel("Name of the Recruit").fill(NAME);
    await page.getByRole("article").getByText(NAME).waitFor();

    const waiting = page.waitForEvent("download");
    await page.getByRole("button", { name: "Take your Writ" }).click();
    const download = await waiting;
    expect(/^writ-of-service-[a-z]+\.png$/.test(download.suggestedFilename()), download.suggestedFilename());
    const saved = join(process.env.SMOKE_SHOTS ?? tmpdir(), "writ-download.png");
    await download.saveAs(saved);
    const bytes = await readFile(saved);
    expect(bytes.subarray(0, 8).toString("hex") === PNG_SIGNATURE, "not a PNG");
    expect(bytes.readUInt32BE(16) === 1240 && bytes.readUInt32BE(20) === 1754, "wrong PNG size");
    expect(bytes.length > 100000, `PNG too small to be a drawn Writ: ${bytes.length}`);

    const fonts = await page.evaluate(() => [
      document.fonts.check('800 96px "Eczar Variable"', "Writ"),
      document.fonts.check('400 32px "Source Serif 4 Variable"', "Writ"),
      document.fonts.check('500 22px "IBM Plex Mono"', "WRIT"),
    ]);
    expect(fonts.every(Boolean), `embedded fonts not loaded: ${fonts}`);

    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie + location.href);
    expect(!stored.includes("Zzyzx"), "name found in storage or URL");
    expect(!requests.some((url) => decodeURIComponent(url).includes("Zzyzx")), "name left in a request");
    await shot(page, "muster-issued-desktop");
    await finish(visit);
  });

  await check("muster: touch completion at 390px, then reassessment clears the name", async () => {
    const visit = await open(phone, "/#/muster");
    const { page } = visit;
    await page.getByRole("button", { name: "Report for assessment" }).click();
    for (let i = 0; i < 7; i += 1) {
      await page.getByText(`Question ${i + 1} of 7`).waitFor();
      await page.getByRole("radio").nth(1).check({ force: true });
      await page.getByRole("button", { name: "Enter your answer" }).click();
    }
    await page.getByLabel("Name of the Recruit").fill(NAME);
    const wide = await overflow(page);
    expect(!wide, `overflow ${wide}`);
    await page.getByRole("button", { name: "Petition for reassessment" }).click();
    await page.getByText("Question 1 of 7").waitFor();
    expect((await page.getByText(NAME).count()) === 0, "name survived reassessment");
    await finish(visit);
  });

  // Asserted, not photographed: a software-GL capture of the filtered map takes close to a minute
  // here, while dragging it holds 60 frames a second.
  await check("wraith-world: the four routes drain, keep their text and do not overflow", async () => {
    for (const hash of ["/#/atlas?place=orodruin", "/#/legions", "/#/chronicle", "/#/muster"]) {
      const visit = await open(desktop, hash);
      const { page } = visit;
      await page.getByRole("button", { name: /claim the ring/i }).click();
      await page.waitForTimeout(1100);
      const state = await page.evaluate(() => ({
        accent: getComputedStyle(document.documentElement).getPropertyValue("--c-accent").trim(),
        title: getComputedStyle(document.querySelector("main h1")).filter,
      }));
      expect(state.accent !== "#c8321a" && state.accent !== "rgb(200, 50, 26)", `accent stayed ${state.accent}`);
      expect(state.title === "none", `filter on text: ${state.title}`);
      const wide = await overflow(page);
      expect(!wide, `${hash} overflow ${wide}`);
      await finish(visit);
    }
  });
}
