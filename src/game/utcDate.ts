/**
 * Canonical UTC calendar day for the daily puzzle.
 * Production: Cloudflare Worker `/api/utc` (isolate clock, not the device).
 * Local dev: Vite middleware with the same path (dev machine clock).
 * Device UTC is last-resort if that request fails (offline).
 */

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

let cached = utcDateString();
let synced = false;

export function getTodayUtc(): string {
  return cached;
}

export function isClockSynced(): boolean {
  return synced;
}

function commit(day: string, fromNetwork: boolean): string {
  cached = day;
  synced = fromNetwork;
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
async function dayFromCloudflare(): Promise<string | null> {
  try {
    const res = await withTimeout(
      fetch(`/api/utc?t=${Date.now()}`, { cache: "no-store" }),
      2500,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { date?: string; utc?: string };
    return dayFromIso(body.date ?? "") ?? dayFromIso(body.utc ?? "");
  } catch {
    return null;
  }
}

/**
 * Resolve today's UTC date from Cloudflare first.
 * Falls back to the device clock only if that request fails.
 */
export async function syncTodayUtc(): Promise<string> {
  const network = await dayFromCloudflare();
  if (network) return commit(network, true);
  return commit(utcDateString(), false);
}
