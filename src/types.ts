export const LETTERS = ["A", "B", "C", "D", "E"] as const;
export type Letter = (typeof LETTERS)[number];

/** Five distinct digits are drawn from 0–9 (never 10 — two glyphs blow column spacing). */
export const POOL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** Daily length. Practice is `PRACTICE_ROWS`. Demo stays on `DEMO_ROWS` in puzzle.ts. */
export const DAILY_ROWS = 60;
export const PRACTICE_ROWS = 20;

export type Mode = "daily" | "practice";
export type Phase = "start" | "playing" | "results";

export interface KeyMap {
  letters: Letter[];
  numbers: number[];
}

export interface Question {
  id: number;
  shown: number[];
  missing: number;
  answer: Letter;
}

export interface Puzzle {
  date: string;
  mode: Mode;
  seed: number;
  key: KeyMap;
  /** Base board (60 daily / 20 practice / debugRows). Never includes endless. */
  questions: Question[];
  /** Pregenerated endless rows (daily only). Same continued seed as `questions`. */
  bonus: Question[];
}

export interface AnswerEvent {
  /** Null means the row timer expired with no pick. */
  letter: Letter | null;
  at: number;
}

export interface RunResult {
  date: string;
  mode: Mode;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  answers: AnswerEvent[];
  correctMask: boolean[];
  correct: number;
  total: number;
  accuracy: number;
  longestSuccess: number;
  longestFail: number;
  endStreak: number;
  firstMistake: number | null;
  avgMs: number;
  qpm: number;
  score: number;
  seed?: number;
  perLetter: LetterStat[];
  missedNumbers: NumberStat[];
  /** Base board length (60, 20, or debugRows). */
  baseTotal?: number;
  /** Endless rows kept after a perfect daily. Terminating miss is not counted. */
  bonusRows?: number;
  /** Wall-clock of the base board only. Hero `durationMs` matches this when bonus ran. */
  dailyDurationMs?: number;
  /** Wall-clock from entering endless until the run ended. */
  bonusDurationMs?: number;
  /** True if the daily 60 was perfect and endless started (even if bonus is 0). */
  enteredBonus?: boolean;
}

export interface LetterStat {
  letter: Letter;
  number: number;
  appearances: number;
  misses: number;
}

export interface NumberStat {
  number: number;
  letter: Letter;
  appearances: number;
  misses: number;
}

export interface PersonalBests {
  bestScore: number | null;
  bestAccuracy: number | null;
  bestTimeMs: number | null;
  bestTimeDate: string | null;
  /** Longest daily endless (rows after the 60). Practice ignores this. */
  bestBonusRows?: number | null;
}

export interface StoredState {
  version: 3;
  daily: Record<string, RunResult>;
  completedDays: string[];
  /** Daily (60-row) personal bests. */
  bests: PersonalBests;
  /** Practice (20-row) personal bests — never mixed with daily. */
  practiceBests: PersonalBests;
}
