// Serves dist/ with Vite's preview and drives system Chrome through every route at two widths.
// Fails on a console error, a page error, an off-origin request or horizontal overflow.
//
// Extension point: every tests/smoke/*.smoke.mjs is imported and its default export called as
//   export default async function (ctx) { await ctx.check("label", async () => { ... }); }
// ctx = { baseURL, viewports, open(viewport, hash, { initScript, ...contextOptions }?), shot(page, name), check(label, fn), overflow(page) }
// `open` returns { page, close() } and close() resolves to any problems seen. Throw inside check to fail. Screenshots go to $SMOKE_SHOTS,
// or the OS temp folder, and never into the repo.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { preview } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const shots = process.env.SMOKE_SHOTS ?? join(tmpdir(), "mordor-smoke-shots");

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
];
const routes = [
  ["threshold", "/#/"],
  ["atlas", "/#/atlas"],
  ["legions", "/#/legions"],
  ["chronicle", "/#/chronicle"],
  ["muster", "/#/muster"],
  ["road", "/#/road"],
  ["not-found", "/#/no-such-road"],
];

if (!existsSync(join(root, "dist", "index.html"))) {
  console.error("smoke: dist/ is missing; run npm run build first");
  process.exit(1);
}
mkdirSync(shots, { recursive: true });

const server = await preview({ root, logLevel: "error", preview: { host: "127.0.0.1", port: 4873 } });
const baseURL = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const failures = [];
const passed = [];

async function open(viewport, hash, { initScript, ...contextOptions } = {}) {
  const { name, width, height, ...device } = viewport;
  const context = await browser.newContext({ viewport: { width, height }, ...device, ...contextOptions });
  const page = await context.newPage();
  if (initScript) await page.addInitScript(initScript);
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console error: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("request", (r) => {
    const url = r.url();
    if (!url.startsWith(`${baseURL}/`) && !/^(data|blob):/.test(url)) problems.push(`off-origin: ${url}`);
  });
  page.on("requestfailed", (r) => {
    if (!/^(data|blob):/.test(r.url())) problems.push(`failed request: ${r.url()}`);
  });
  await page.goto(`${baseURL}${hash}`, { waitUntil: "load" });
  await page.locator("main h1").first().waitFor({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  return {
    page,
    problems,
    async close() {
      await context.close();
      return problems;
    },
  };
}

async function shot(page, name, options) {
  await page.screenshot({ path: join(shots, `${name}.png`), ...options });
}

async function overflow(page) {
  return page.evaluate(() => {
    const { scrollWidth, clientWidth } = document.documentElement;
    return scrollWidth > clientWidth ? `${scrollWidth} > ${clientWidth}` : null;
  });
}

async function check(label, run) {
  try {
    await run();
    passed.push(label);
    console.log(`ok    ${label}`);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    console.log(`FAIL  ${label}: ${error.message}`);
  }
}

for (const viewport of viewports) {
  for (const [name, hash] of routes) {
    await check(`${name} @ ${viewport.name}`, async () => {
      const visit = await open(viewport, hash);
      await visit.page.waitForTimeout(400);
      const wide = await overflow(visit.page);
      await shot(visit.page, `${name}-${viewport.name}`);
      const problems = await visit.close();
      if (wide) problems.push(`horizontal overflow: ${wide}`);
      if (problems.length) throw new Error(problems.join("; "));
    });
  }
}

const ctx = { baseURL, viewports, open, shot, check, overflow };
const extras = readdirSync(here).filter((file) => file.endsWith(".smoke.mjs")).sort();
for (const file of extras) {
  const module = await import(pathToFileURL(join(here, file)).href);
  await module.default(ctx);
}

await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));

console.log(`\nsmoke: ${passed.length} passed, ${failures.length} failed. Screenshots: ${shots}`);
if (failures.length) {
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
process.exit(0);
