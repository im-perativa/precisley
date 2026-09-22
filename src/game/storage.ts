import type { PersonalBests, RunResult, StoredState } from "../types.ts";

const KEY = "focustest.v3";

const emptyBests = (): PersonalBests => ({
  bestScore: null,
  bestAccuracy: null,
  bestTimeMs: null,
  bestTimeDate: null,
  bestBonusRows: null,
});

function empty(): StoredState {
  return {
    version: 3,
    daily: {},
    completedDays: [],
    bests: emptyBests(),
    practiceBests: emptyBests(),
  };
}

export function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as StoredState;
    if (parsed.version !== 3 || !parsed.daily || !parsed.bests || !parsed.practiceBests) {
      return empty();
    }
    return parsed;
  } catch {
    return empty();
  }
}

export function saveState(state: StoredState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getDailyResult(date: string): RunResult | null {
  return loadState().daily[date] ?? null;
}

function baseLen(result: RunResult): number {
  if (result.baseTotal != null) return result.baseTotal;
  if (result.bonusRows != null && result.bonusRows > 0) {
    return result.total - result.bonusRows;
  }
  return result.total;
}

/** A shorter debug/skip board must not replace a stored full daily. */
function shouldKeepDaily(prev: RunResult | undefined, result: RunResult): boolean {
  if (!prev) return true;
  if (baseLen(result) < baseLen(prev)) return false;
  const bonus = result.bonusRows ?? 0;
  const prevBonus = prev.bonusRows ?? 0;
  return result.accuracy === 1 && prev.accuracy === 1 && bonus >= prevBonus;
}

export function recordRun(
  result: RunResult,
  opts?: { persistDaily?: boolean },
): StoredState {
  const persistDaily = opts?.persistDaily !== false;
  const state = loadState();
  if (result.mode === "daily") {
    const prev = state.daily[result.date];
    if (persistDaily && shouldKeepDaily(prev, result)) {
      state.daily[result.date] = result;
      if (!state.completedDays.includes(result.date)) {
        state.completedDays.push(result.date);
        state.completedDays.sort();
      }
      updateBests(state.bests, result);
    } else {
      // Protected real daily (or skip-to-bonus after one): still record endless PB.
      updateBonusBest(state.bests, result);
    }
  } else {
    updateBests(state.practiceBests, result);
  }
  saveState(state);
  return state;
}

function enteredBonus(result: RunResult): boolean {
  return Boolean(result.enteredBonus) || (result.bonusRows ?? 0) > 0;
}

/** Longest endless only ever increases — a bonus-0 checkpoint must not wipe a higher PB. */
function updateBonusBest(bests: PersonalBests, result: RunResult): void {
  if (result.mode !== "daily" || !enteredBonus(result)) return;
  const bonus = result.bonusRows ?? 0;
  bests.bestBonusRows = Math.max(bests.bestBonusRows ?? 0, bonus);
}

function updateBests(bests: PersonalBests, result: RunResult): void {
  if (bests.bestScore === null || result.score > bests.bestScore) {
    bests.bestScore = result.score;
  }
  if (bests.bestAccuracy === null || result.accuracy > bests.bestAccuracy) {
    bests.bestAccuracy = result.accuracy;
  }
  if (result.accuracy === 1 && result.total > 0) {
    if (bests.bestTimeMs === null || result.durationMs < bests.bestTimeMs) {
      bests.bestTimeMs = result.durationMs;
      bests.bestTimeDate = result.date;
    }
  }
  updateBonusBest(bests, result);
}

export function lastDays(completedDays: string[], today: string, n: number): boolean[] {
  const set = new Set(completedDays);
  const [y, m, d] = today.split("-").map(Number);
  const cursor = Date.UTC(y!, m! - 1, d!);
  const out: boolean[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(cursor - i * 86400000);
    out.push(set.has(dt.toISOString().slice(0, 10)));
  }
  return out;
}
