import type { Mode } from "../types.ts";

/** Practice (and fallback) per-row window. */
export const ROW_WINDOW_MS = 10_000;

/**
 * Daily: seconds for each block of 10 rows.
 * 1–10 → 10s, 11–20 → 8s, 21–30 → 6s, 31–40 → 5s, 41–50 → 4s, 51–60 → 3s.
 */
export const DAILY_ROW_WINDOWS_SEC = [10, 8, 6, 5, 4, 3] as const;

export function rowWindowSec(rowIndex: number, mode: Mode): number {
  if (mode !== "daily") return ROW_WINDOW_MS / 1000;
  const block = Math.floor(Math.max(0, rowIndex) / 10);
  const capped = Math.min(block, DAILY_ROW_WINDOWS_SEC.length - 1);
  return DAILY_ROW_WINDOWS_SEC[capped]!;
}

export function rowWindowMs(rowIndex: number, mode: Mode): number {
  return rowWindowSec(rowIndex, mode) * 1000;
}
