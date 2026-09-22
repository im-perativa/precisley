import { LETTERS, type AnswerEvent, type Puzzle, type RunResult } from "../types.ts";
import { replayRowWindowSec } from "./timing.ts";

export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const tenths = Math.floor((clamped % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(tenths).padStart(2, "0")}`;
}

export function formatPct(accuracy: number): string {
  return `${(accuracy * 100).toFixed(1)}%`;
}

/**
 * Score = accuracy² × 10,000 − 2 × seconds.
 * Accuracy is correct / scored rows (kept endless rows included; the terminating miss is not).
 * Daily time/score use the base-board clock only — endless does not make a 100% look slower.
 */
export const SCORE_NOTE = "score = acc² × 10,000 − 2 × seconds";

/** Endless unlocked: perfect daily board (`enteredBonus`) or kept bonus rows. */
export function bonusUnlocked(result: {
  mode: RunResult["mode"];
  enteredBonus?: boolean;
  bonusRows?: number;
  baseTotal?: number;
  total: number;
  accuracy: number;
  correctMask: boolean[];
}): boolean {
  if (result.mode !== "daily") return false;
  if (result.enteredBonus) return true;
  if ((result.bonusRows ?? 0) > 0) return true;
  const base = result.baseTotal ?? result.total;
  if (base <= 0) return false;
  if (result.correctMask.length >= base) {
    return result.correctMask.slice(0, base).every(Boolean);
  }
  return result.accuracy === 1 && result.total === base;
}

export function computeScore(correct: number, total: number, durationMs: number): number {
  if (total <= 0) return 0;
  const accuracy = correct / total;
  const seconds = durationMs / 1000;
  return Math.max(0, Math.round(accuracy * accuracy * 10000 - seconds * 2));
}

export function analyzeRun(
  puzzle: Puzzle,
  answers: AnswerEvent[],
  startedAt: number,
  endedAt: number,
  opts?: { baseTotal?: number; dailyEndedAt?: number | null },
): RunResult {
  const total = puzzle.questions.length;
  const baseTotal = opts?.baseTotal ?? total;
  const fullDuration = Math.max(0, endedAt - startedAt);
  const dailyEndedAt = opts?.dailyEndedAt ?? null;
  const dailyDurationMs = dailyEndedAt != null ? Math.max(0, dailyEndedAt - startedAt) : fullDuration;
  const bonusDurationMs = dailyEndedAt != null ? Math.max(0, endedAt - dailyEndedAt) : 0;
  const bonusRows = Math.max(0, total - baseTotal);
  const durationMs = dailyDurationMs;
  const correctMask = puzzle.questions.map((q, i) => answers[i]?.letter === q.answer);

  let correct = 0;
  let longestSuccess = 0;
  let longestFail = 0;
  let runOk = 0;
  let runBad = 0;
  let firstMistake: number | null = null;

  for (let i = 0; i < total; i++) {
    if (correctMask[i]) {
      correct += 1;
      runOk += 1;
      runBad = 0;
      longestSuccess = Math.max(longestSuccess, runOk);
    } else {
      runBad += 1;
      runOk = 0;
      longestFail = Math.max(longestFail, runBad);
      if (firstMistake === null) firstMistake = i + 1;
    }
  }

  let endStreak = 0;
  for (let i = total - 1; i >= 0; i--) {
    if (!correctMask[i]) break;
    endStreak += 1;
  }

  const windowsSec = replayRowWindowSec(
    total,
    correctMask,
    puzzle.mode,
    baseTotal,
    dailyEndedAt != null,
  );
  const intervals: number[] = [];
  let prev = startedAt;
  for (let i = 0; i < total; i++) {
    const ev = answers[i];
    const windowMs = (windowsSec[i] ?? 10) * 1000;
    const at = ev?.at ?? prev + windowMs;
    const raw = Math.max(0, at - prev);
    intervals.push(ev?.letter == null ? windowMs : raw);
    prev = at;
  }
  const avgMs =
    intervals.length === 0
      ? fullDuration
      : intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const qpm = fullDuration > 0 ? (total / fullDuration) * 60000 : 0;

  const perLetter = LETTERS.map((letter, idx) => {
    const number = puzzle.key.numbers[idx]!;
    let appearances = 0;
    let misses = 0;
    puzzle.questions.forEach((q, i) => {
      if (q.answer !== letter) return;
      appearances += 1;
      if (!correctMask[i]) misses += 1;
    });
    return { letter, number, appearances, misses };
  });

  const missedNumbers = perLetter.map((s) => ({
    number: s.number,
    letter: s.letter,
    appearances: s.appearances,
    misses: s.misses,
  }));

  return {
    date: puzzle.date,
    mode: puzzle.mode,
    startedAt,
    endedAt,
    durationMs,
    answers,
    correctMask,
    correct,
    total,
    accuracy: total === 0 ? 0 : correct / total,
    longestSuccess,
    longestFail,
    endStreak,
    firstMistake,
    avgMs,
    qpm,
    score: computeScore(correct, total, durationMs),
    seed: puzzle.seed,
    perLetter,
    missedNumbers,
    baseTotal,
    bonusRows,
    dailyDurationMs,
    bonusDurationMs,
    enteredBonus: dailyEndedAt != null,
  };
}

export function consecutiveDays(completedDays: string[], today: string): number {
  const set = new Set(completedDays);
  let streak = 0;
  const [y, m, d] = today.split("-").map(Number);
  const cursor = Date.UTC(y!, m! - 1, d!);
  for (let i = 0; i < 400; i++) {
    const dt = new Date(cursor - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    if (set.has(key)) streak += 1;
    else break;
  }
  return streak;
}
