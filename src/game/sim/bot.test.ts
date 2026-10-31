// @vitest-environment node
// Proof the game is finishable and not trivial. BOT_SEEDS=60 npx vitest run src/game/sim/bot prints the balance table.
import { describe, expect, it, vi } from "vitest";
import { createCarefulBot, createRushBot, playOut } from "./bot";
import type { Bot, BotResult } from "./bot";
import { createWorld, STAGE_IDS, step } from "./index";
import type { StepInput, World } from "./index";

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env;
const seeds = Number(env?.BOT_SEEDS ?? 6);

function table(label: string, results: BotResult[]): void {
  const wins = results.filter((r) => r.won);
  const reached = STAGE_IDS.map((_, i) => results.filter((r) => r.won || r.stage >= i).length);
  const causes: Record<string, number> = {};
  for (const r of results) if (r.cause) causes[`${r.cause}@${r.stage}`] = (causes[`${r.cause}@${r.stage}`] ?? 0) + 1;
  const mean = (values: number[]): number => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  const perStage = STAGE_IDS.map((_, i) => mean(results.map((r) => r.stageSeconds[i] ?? NaN).filter((v) => !Number.isNaN(v))).toFixed(0));
  console.log(
    `${label}: wins ${wins.length}/${results.length}; reached ${reached.join("/")}; causes ${JSON.stringify(causes)}; ` +
      `win time ${mean(wins.map((r) => r.seconds)).toFixed(0)}s burden ${mean(wins.map((r) => r.burden)).toFixed(2)} water ${mean(wins.map((r) => r.water)).toFixed(2)} ` +
      `uses ${mean(wins.map((r) => r.ringUses)).toFixed(1)}; stage s ${perStage.join("/")}`,
  );
}

/** What the keyboard can send: eight directions, not the bot's sixteen. */
function onKeys(bot: Bot): Bot {
  const axis = (value: number): number => (Math.abs(value) > 0.38 ? Math.sign(value) : 0);
  return (world) => {
    const input = bot(world);
    return { ...input, moveX: axis(input.moveX), moveY: axis(input.moveY) };
  };
}

describe("determinism over a whole run", () => {
  it("is a function of the seed and the inputs, with no clock or Math.random", () => {
    const refuse = (): never => {
      throw new Error("the sim read a clock or Math.random");
    };
    const clocks = [
      vi.spyOn(Math, "random").mockImplementation(refuse),
      vi.spyOn(Date, "now").mockImplementation(refuse),
      vi.spyOn(performance, "now").mockImplementation(refuse),
    ];
    try {
      const bot = createCarefulBot();
      const inputs: StepInput[] = [];
      let world = createWorld(1000);
      let middle: { at: number; json: string } | null = null;
      while (world.phase !== "won" && world.phase !== "lost") {
        const input = bot(world);
        inputs.push(input);
        world = step(world, input);
        if (!middle && world.stageIndex >= 2 && world.phase === "playing") middle = { at: inputs.length, json: JSON.stringify(world) };
      }
      // Must cross stages: one stage cannot show the stage hand-over is deterministic.
      expect(world.stageIndex).toBeGreaterThanOrEqual(2);
      expect(inputs.reduce((replayed, input) => step(replayed, input), createWorld(1000))).toEqual(world);
      const resumed = inputs.slice(middle!.at).reduce((replayed, input) => step(replayed, input), JSON.parse(middle!.json) as World);
      expect(resumed).toEqual(world);
    } finally {
      for (const clock of clocks) clock.mockRestore();
    }
  }, 60_000);
});

describe("balance, by headless bots", () => {
  const seedList = Array.from({ length: seeds }, (_, i) => 1000 + i * 37);

  it("a careful player can finish the road", () => {
    const results = seedList.map((seed) => playOut(createWorld(seed), createCarefulBot()));
    table("careful", results);
    expect(results.filter((r) => r.won).length).toBeGreaterThan(0);
    // Not a walkover: this bot sees the whole map and the exact sweep, and still loses some runs.
    expect(results.filter((r) => r.won).length).toBeLessThan(results.length);
  }, 120_000);

  it("a careful player can finish on the keyboard's eight directions", () => {
    const won = [1000, 1037, 1074].some((seed) => playOut(createWorld(seed), onKeys(createCarefulBot())).won);
    expect(won).toBe(true);
  }, 60_000);

  it("reports the same player without the Ring", () => {
    const results = seedList.map((seed) => playOut(createWorld(seed), createCarefulBot({ ringBudget: 0 })));
    table("no ring", results);
    expect(results.every((r) => r.ringUses === 0)).toBe(true);
  }, 120_000);

  it("rushing the shortest road never wins", () => {
    const results = seedList.map((seed) => playOut(createWorld(seed), createRushBot()));
    table("rush", results);
    expect(results.filter((r) => r.won)).toHaveLength(0);
  }, 60_000);
});
