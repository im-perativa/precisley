export const LETTERS = ["A", "B", "C", "D", "E"] as const;
export type Letter = (typeof LETTERS)[number];

/** Five distinct digits are drawn from 0–9 (never 10 — two glyphs blow column spacing). */
export const POOL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const DEFAULT_ROWS = 100;

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
  questions: Question[];
}

export interface AnswerEvent {
  /** Null means the 5s window expired with no pick. */
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
}

export interface StoredState {
  version: 1;
  daily: Record<string, RunResult>;
  completedDays: string[];
  bests: PersonalBests;
}
