import {
  DEFAULT_ROWS,
  LETTERS,
  POOL,
  type Letter,
  type Mode,
  type Puzzle,
  type Question,
} from "../types.ts";
import { hashString, mulberry32, seedFromDate, shuffleInPlace } from "./rng.ts";

export function debugRowCount(): number | null {
  const raw = new URLSearchParams(window.location.search).get("debugRows");
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(DEFAULT_ROWS, Math.floor(n));
}

export function rowCount(): number {
  return debugRowCount() ?? DEFAULT_ROWS;
}

export function buildPuzzle(opts: {
  date: string;
  mode: Mode;
  seed: number;
  count?: number;
}): Puzzle {
  const fullCount = DEFAULT_ROWS;
  const visible = opts.count ?? fullCount;
  const rand = mulberry32(opts.seed);

  const pool = shuffleInPlace([...POOL], rand); // 0–9, five distinct digits as A–E
  const numbers = pool.slice(0, 5);
  const letters = [...LETTERS];

  const missPattern: number[] = [];
  for (let i = 0; i < fullCount; i++) {
    missPattern.push(i % 5);
  }
  shuffleInPlace(missPattern, rand);

  const questions: Question[] = missPattern.map((missingIndex, i) => {
    const missing = numbers[missingIndex]!;
    const shown = numbers.filter((_, idx) => idx !== missingIndex);
    shuffleInPlace(shown, rand);
    return {
      id: i + 1,
      shown: [...shown],
      missing,
      answer: letters[missingIndex]!,
    };
  });

  return {
    date: opts.date,
    mode: opts.mode,
    seed: opts.seed,
    key: { letters, numbers },
    questions: questions.slice(0, visible),
  };
}

export function dailyPuzzle(date: string, count?: number): Puzzle {
  // `date` must be getTodayUtc() so the seed matches trivia's daily key.
  return buildPuzzle({
    date,
    mode: "daily",
    seed: seedFromDate(date),
    count,
  });
}

export function practicePuzzle(date: string, count?: number): Puzzle {
  const seed = (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
  return buildPuzzle({
    date,
    mode: "practice",
    seed,
    count,
  });
}

/** Homepage demo: same generator as daily/practice, 10 rows. Pass a seed to freeze; omit to randomize. */
export const DEMO_ROWS = 10;
export const DEMO_SEED = hashString("focustest:demo:v1");

export function demoPuzzle(seed: number = DEMO_SEED): Puzzle {
  return buildPuzzle({
    date: "demo",
    mode: "practice",
    seed,
    count: DEMO_ROWS,
  });
}

export function letterFromKey(key: string): Letter | null {
  const k = key.toUpperCase();
  if (k === "1" || k === "A") return "A";
  if (k === "2" || k === "B") return "B";
  if (k === "3" || k === "C") return "C";
  if (k === "4" || k === "D") return "D";
  if (k === "5" || k === "E") return "E";
  return null;
}
