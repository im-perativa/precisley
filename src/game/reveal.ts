export type HeatKind = "ok" | "bad" | "break";

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function tripDelay(okStreak: number, badStreak: number, broke: boolean): number {
  if (prefersReducedMotion()) return 18;
  if (broke) return 260;
  if (okStreak > 0) return Math.max(40, 148 - okStreak * 7);
  return Math.max(78, 168 - badStreak * 6);
}

export function advanceStreak(
  okS: number,
  badS: number,
  correct: boolean,
): { okS: number; badS: number; kind: HeatKind } {
  const broke = okS > 0 && !correct;
  if (broke) return { okS: 0, badS: 1, kind: "break" };
  if (correct) return { okS: okS + 1, badS: 0, kind: "ok" };
  return { okS: 0, badS: badS + 1, kind: "bad" };
}
