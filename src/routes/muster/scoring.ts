import type { MusterQuestion, Station, StationId } from "../../content/muster";

/** question id to answer id */
export type Answers = Record<string, string>;

export function tally(questions: MusterQuestion[], answers: Answers): Partial<Record<StationId, number>> {
  const totals: Partial<Record<StationId, number>> = {};
  for (const question of questions) {
    const chosen = question.answers.find((answer) => answer.id === answers[question.id]);
    if (!chosen) continue;
    for (const [id, score] of Object.entries(chosen.scores) as [StationId, number][]) {
      totals[id] = (totals[id] ?? 0) + score;
    }
  }
  return totals;
}

/** Highest total wins. On a tie the station earliest in `stations` wins (see content/muster.ts). */
export function determineStation(stations: Station[], questions: MusterQuestion[], answers: Answers): Station {
  const totals = tally(questions, answers);
  let best = stations[0]!;
  let bestTotal = totals[best.id] ?? 0;
  for (const station of stations) {
    const total = totals[station.id] ?? 0;
    if (total > bestTotal) {
      best = station;
      bestTotal = total;
    }
  }
  return best;
}
