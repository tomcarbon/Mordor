import { gameOver } from "../../content/road";
import type { LossCause } from "../../game/sim";

// road.ts says one line at random. Some lines only fit one failure, so each draws from those that fit.
const FITTING: Record<LossCause, number[]> = {
  eye: [0, 2, 3, 6, 7, 8, 9],
  patrol: [0, 1, 2, 4, 6, 7, 8, 9],
  spider: [0, 6, 7, 8, 9],
  burden: [0, 4, 5, 6, 9],
};

export function pickLossLine(cause: LossCause, random: () => number = Math.random): string {
  const options = FITTING[cause];
  return gameOver.lines[options[Math.floor(random() * options.length)]!]!;
}
