import type { PersonalBests, RunResult, StoredState } from "../types.ts";

const KEY = "focustest.v1";

const emptyBests = (): PersonalBests => ({
  bestScore: null,
  bestAccuracy: null,
  bestTimeMs: null,
  bestTimeDate: null,
});

function empty(): StoredState {
  return {
    version: 1,
    daily: {},
    completedDays: [],
    bests: emptyBests(),
  };
}

export function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as StoredState;
    if (parsed.version !== 1 || !parsed.daily || !parsed.bests) return empty();
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

export function recordRun(result: RunResult): StoredState {
  const state = loadState();
  if (result.mode === "daily") {
    if (!state.daily[result.date]) {
      state.daily[result.date] = result;
      if (!state.completedDays.includes(result.date)) {
        state.completedDays.push(result.date);
        state.completedDays.sort();
      }
    }
  }
  updateBests(state.bests, result);
  saveState(state);
  return state;
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
