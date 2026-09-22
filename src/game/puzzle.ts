import {
  DAILY_ROWS,
  LETTERS,
  POOL,
  PRACTICE_ROWS,
  type KeyMap,
  type Letter,
  type Mode,
  type Puzzle,
  type Question,
} from "../types.ts";
import { hashString, mulberry32, seedFromDate, shuffleInPlace } from "./rng.ts";

/** Pregenerated endless rows (same continued daily seed). */
export const BONUS_CHUNK = 120;
/** Keep this many unused bonus rows on the live list. */
export const BONUS_LOOKAHEAD = 10;

export function debugRowCount(): number | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(window.location.search).get("debugRows");
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(DAILY_ROWS, Math.floor(n));
}

export function defaultRowCount(mode: Mode): number {
  return mode === "practice" ? PRACTICE_ROWS : DAILY_ROWS;
}

/** `?debugRows=` overrides both modes for short tests. DEV builds only. */
export function rowCount(mode: Mode): number {
  return debugRowCount() ?? defaultRowCount(mode);
}

function makeKey(rand: () => number): KeyMap {
  const pool = shuffleInPlace([...POOL], rand);
  return { letters: [...LETTERS], numbers: pool.slice(0, 5) };
}

function generateQuestions(key: KeyMap, rand: () => number, startId: number, count: number): Question[] {
  if (count <= 0) return [];
  const missPattern: number[] = [];
  for (let i = 0; i < count; i++) {
    missPattern.push(i % 5);
  }
  shuffleInPlace(missPattern, rand);
  return missPattern.map((missingIndex, i) => {
    const missing = key.numbers[missingIndex]!;
    const shown = key.numbers.filter((_, idx) => idx !== missingIndex);
    shuffleInPlace(shown, rand);
    return {
      id: startId + i,
      shown: [...shown],
      missing,
      answer: key.letters[missingIndex]!,
    };
  });
}

/** Replay RNG through key + `baseCount` + `bonusAlready`, then mint `extra` more bonus rows. */
export function moreBonusQuestions(puzzle: Puzzle, bonusAlready: number, extra = BONUS_CHUNK): Question[] {
  const rand = mulberry32(puzzle.seed);
  const key = makeKey(rand);
  generateQuestions(key, rand, 1, puzzle.questions.length);
  if (bonusAlready > 0) {
    generateQuestions(key, rand, puzzle.questions.length + 1, bonusAlready);
  }
  return generateQuestions(key, rand, puzzle.questions.length + bonusAlready + 1, extra);
}

export function buildPuzzle(opts: {
  date: string;
  mode: Mode;
  seed: number;
  count?: number;
}): Puzzle {
  const count = opts.count ?? defaultRowCount(opts.mode);
  const rand = mulberry32(opts.seed);
  const key = makeKey(rand);
  const questions = generateQuestions(key, rand, 1, count);
  const bonus =
    opts.mode === "daily" ? generateQuestions(key, rand, count + 1, BONUS_CHUNK) : [];

  return {
    date: opts.date,
    mode: opts.mode,
    seed: opts.seed,
    key,
    questions,
    bonus,
  };
}

export function dailyPuzzle(date: string, count?: number): Puzzle {
  // `date` must be getTodayUtc() so the seed matches trivia's daily key.
  return buildPuzzle({
    date,
    mode: "daily",
    seed: seedFromDate(date),
    count: count ?? rowCount("daily"),
  });
}

export function practicePuzzle(date: string, count?: number): Puzzle {
  const seed = (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
  return buildPuzzle({
    date,
    mode: "practice",
    seed,
    count: count ?? rowCount("practice"),
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
