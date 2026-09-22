import { LETTERS, type AnswerEvent, type Puzzle, type RunResult } from "../types.ts";
import { rowWindowMs } from "./timing.ts";

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
 * Accuracy is correct / this run's total (60 daily, 20 practice, or debugRows).
 * Time is wall-clock seconds for that run. Daily and practice PBs stay separate.
 */
export const SCORE_NOTE = "score = acc² × 10,000 − 2 × seconds";

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
): RunResult {
  const total = puzzle.questions.length;
  const durationMs = Math.max(0, endedAt - startedAt);
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

  const intervals: number[] = [];
  let prev = startedAt;
  for (let i = 0; i < total; i++) {
    const ev = answers[i];
    const windowMs = rowWindowMs(i, puzzle.mode);
    const at = ev?.at ?? prev + windowMs;
    const raw = Math.max(0, at - prev);
    intervals.push(ev?.letter == null ? windowMs : raw);
    prev = at;
  }
  const avgMs =
    intervals.length === 0
      ? durationMs
      : intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const qpm = durationMs > 0 ? (total / durationMs) * 60000 : 0;

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
