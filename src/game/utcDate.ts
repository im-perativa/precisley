/**
 * Canonical UTC calendar day for the daily puzzle.
 * Production: Cloudflare Worker `/api/utc` (isolate clock, not the device).
 * Local dev: Vite middleware with the same path (dev machine clock).
 * Device UTC is last-resort if that request fails (offline).
 */

/** UTC day that is precisley #1. Puzzle number = days since this date + 1. */
export const PUZZLE_EPOCH = "2026-09-01";

export function utcDateString(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayFromIso(value: string): string | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1]! : null;
}

function utcDayMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

export function puzzleNumber(date: string): number {
  return Math.floor((utcDayMs(date) - utcDayMs(PUZZLE_EPOCH)) / 86400000) + 1;
}

let cached = utcDateString();
let synced = false;
let serverUtcMs = Date.now();
let localAtSync = Date.now();

export function getTodayUtc(): string {
  return cached;
}

export function isClockSynced(): boolean {
  return synced;
}

/** Estimated UTC now, using `/api/utc` offset when synced. */
export function nowUtcMs(): number {
  return serverUtcMs + (Date.now() - localAtSync);
}

export function nextUtcMidnightMs(fromMs = nowUtcMs()): number {
  const d = new Date(fromMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function msUntilNextUtcDay(): number {
  return Math.max(0, nextUtcMidnightMs() - nowUtcMs());
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function commit(day: string, fromNetwork: boolean, utcMs: number): string {
  cached = day;
  synced = fromNetwork;
  serverUtcMs = utcMs;
  localAtSync = Date.now();
  return day;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Same-origin `/api/utc` — Cloudflare Worker in production. */
async function snapshotFromCloudflare(): Promise<{ date: string; utcMs: number } | null> {
  try {
    const res = await withTimeout(
      fetch(`/api/utc?t=${Date.now()}`, { cache: "no-store" }),
      2500,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { date?: string; utc?: string };
    const date = dayFromIso(body.date ?? "") ?? dayFromIso(body.utc ?? "");
    if (!date) return null;
    const parsed = body.utc ? Date.parse(body.utc) : Number.NaN;
    const utcMs = Number.isFinite(parsed) ? parsed : Date.now();
    return { date, utcMs };
  } catch {
    return null;
  }
}

/**
 * Resolve today's UTC date from Cloudflare first.
 * Falls back to the device clock only if that request fails.
 */
export async function syncTodayUtc(): Promise<string> {
  const network = await snapshotFromCloudflare();
  if (network) return commit(network.date, true, network.utcMs);
  return commit(utcDateString(), false, Date.now());
}
