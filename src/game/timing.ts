import { DAILY_ROWS, type Mode } from "../types.ts";

/** Practice (and fallback) per-row block window. */
export const ROW_WINDOW_MS = 10_000;

/**
 * Daily: seconds for each block of 10 rows.
 * 1–10 → 10s, 11–20 → 8s, 21–30 → 7s, 31–40 → 6s, 41–50 → 5s, 51–60 → 4s.
 */
export const DAILY_ROW_WINDOWS_SEC = [10, 8, 7, 6, 5, 4] as const;

export const BONUS_WINDOW_START_SEC = 4;
export const BONUS_WINDOW_STEP_SEC = 0.1;
export const BONUS_WINDOW_FLOOR_SEC = 2;
export const BONUS_WINDOW_BLOCK = 10;

/** Each correct tightens the next bar by this many seconds. */
export const TIGHTNESS_STEP_SEC = 0.5;
/** A miss loosens the next bar by this many seconds (never above the current block). */
export const TIGHTNESS_MISS_SEC = 1;
/** Combo floor on the daily board (and practice). Endless uses `BONUS_WINDOW_FLOOR_SEC`. */
export const DAILY_WINDOW_FLOOR_SEC = 2.5;

export function bonusWindowSec(bonusIndex: number): number {
  const block = Math.floor(Math.max(0, bonusIndex) / BONUS_WINDOW_BLOCK);
  const sec = BONUS_WINDOW_START_SEC - block * BONUS_WINDOW_STEP_SEC;
  return Math.max(BONUS_WINDOW_FLOOR_SEC, Math.round(sec * 10) / 10);
}

/** Ladder / bonus block only — no combo tightness. */
export function blockWindowSec(rowIndex: number, mode: Mode, baseTotal: number = DAILY_ROWS): number {
  if (mode !== "daily") return ROW_WINDOW_MS / 1000;
  if (rowIndex >= baseTotal) {
    return bonusWindowSec(rowIndex - baseTotal);
  }
  const block = Math.floor(Math.max(0, rowIndex) / 10);
  const capped = Math.min(block, DAILY_ROW_WINDOWS_SEC.length - 1);
  return DAILY_ROW_WINDOWS_SEC[capped]!;
}

export function windowFloorSec(rowIndex: number, mode: Mode, baseTotal: number = DAILY_ROWS): number {
  if (mode === "daily" && rowIndex >= baseTotal) return BONUS_WINDOW_FLOOR_SEC;
  return DAILY_WINDOW_FLOOR_SEC;
}

export function snapWindowSec(sec: number): number {
  return Math.round(sec * 10) / 10;
}

export function nextTightness(tightness: number, correct: boolean): number {
  if (correct) return tightness + 1;
  const missSteps = TIGHTNESS_MISS_SEC / TIGHTNESS_STEP_SEC;
  return Math.max(0, tightness - missSteps);
}

export function rowWindowSec(
  rowIndex: number,
  mode: Mode,
  baseTotal: number = DAILY_ROWS,
  tightness: number = 0,
): number {
  const block = blockWindowSec(rowIndex, mode, baseTotal);
  const steps = Math.max(0, tightness);
  if (steps === 0) return block;
  const trimmed = block - steps * TIGHTNESS_STEP_SEC;
  const floor = windowFloorSec(rowIndex, mode, baseTotal);
  return Math.max(floor, Math.min(block, snapWindowSec(trimmed)));
}

export function rowWindowMs(
  rowIndex: number,
  mode: Mode,
  baseTotal: number = DAILY_ROWS,
  tightness: number = 0,
): number {
  return rowWindowSec(rowIndex, mode, baseTotal, tightness) * 1000;
}

/** Per-row windows matching live tightness (−0.5s correct, +1s miss, reset at endless). */
export function replayRowWindowSec(
  total: number,
  correctMask: readonly boolean[],
  mode: Mode,
  baseTotal: number,
  resetTightnessAtBase: boolean,
): number[] {
  let tightness = 0;
  const windows: number[] = [];
  for (let i = 0; i < total; i++) {
    windows.push(rowWindowSec(i, mode, baseTotal, tightness));
    tightness = nextTightness(tightness, Boolean(correctMask[i]));
    if (resetTightnessAtBase && i + 1 === baseTotal) tightness = 0;
  }
  return windows;
}

export function formatWindowLabel(sec: number): string {
  const rounded = snapWindowSec(sec);
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}
