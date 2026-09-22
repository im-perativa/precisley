import { DAILY_ROWS, type Mode } from "../types.ts";

/** Practice (and fallback) per-row window. */
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

export function bonusWindowSec(bonusIndex: number): number {
  const block = Math.floor(Math.max(0, bonusIndex) / BONUS_WINDOW_BLOCK);
  const sec = BONUS_WINDOW_START_SEC - block * BONUS_WINDOW_STEP_SEC;
  return Math.max(BONUS_WINDOW_FLOOR_SEC, Math.round(sec * 10) / 10);
}

export function rowWindowSec(rowIndex: number, mode: Mode, baseTotal: number = DAILY_ROWS): number {
  if (mode !== "daily") return ROW_WINDOW_MS / 1000;
  if (rowIndex >= baseTotal) {
    return bonusWindowSec(rowIndex - baseTotal);
  }
  const block = Math.floor(Math.max(0, rowIndex) / 10);
  const capped = Math.min(block, DAILY_ROW_WINDOWS_SEC.length - 1);
  return DAILY_ROW_WINDOWS_SEC[capped]!;
}

export function rowWindowMs(rowIndex: number, mode: Mode, baseTotal: number = DAILY_ROWS): number {
  return rowWindowSec(rowIndex, mode, baseTotal) * 1000;
}

export function formatWindowLabel(sec: number): string {
  const rounded = Math.round(sec * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}s` : `${rounded.toFixed(1)}s`;
}
