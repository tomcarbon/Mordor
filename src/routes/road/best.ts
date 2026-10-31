// Best run, under the one key the ADR gives the game. Storage can throw; losing a record is harmless.
const KEY = "mordor.road.v1";
const FIELDS = ["burden", "seconds", "stage", "won"];
/** A day of game time. Water and burden end a run long before this. */
const MAX_SECONDS = 86400;

export interface BestRun {
  won: boolean;
  /** Stages entered, 1-4. */
  stage: number;
  seconds: number;
  /** 0-100. */
  burden: number;
}

function isBest(value: unknown): value is BestRun {
  if (typeof value !== "object" || value === null) return false;
  if (Object.keys(value).sort().join() !== FIELDS.join()) return false;
  const { won, stage, seconds, burden } = value as Record<string, unknown>;
  return (
    typeof won === "boolean" &&
    Number.isInteger(stage) &&
    (stage as number) >= 1 &&
    (stage as number) <= 4 &&
    Number.isFinite(seconds) &&
    (seconds as number) >= 0 &&
    (seconds as number) <= MAX_SECONDS &&
    Number.isFinite(burden) &&
    (burden as number) >= 0 &&
    (burden as number) <= 100
  );
}

export function readBest(): BestRun | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isBetter(run: BestRun, best: BestRun | null): boolean {
  if (!best) return true;
  if (run.won !== best.won) return run.won;
  if (run.won) return run.seconds < best.seconds;
  return run.stage > best.stage;
}

/** Stores `run` if it beats the record, and returns whichever stands. */
export function recordRun(run: BestRun): BestRun {
  const best = readBest();
  if (!isBetter(run, best)) return best!;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // Private mode or a full disk: the run simply goes unrecorded.
  }
  return run;
}

export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
