/**
 * Shared UTC calendar day for the daily puzzle seed and trivia picks.
 * No backend: browser UTC first, optional HTTP Date skew check.
 */

const SKEW_LIMIT_MS = 36 * 60 * 60 * 1000;

export function utcDateString(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

let cached = utcDateString();

/** Last resolved UTC day (local clock, then optional skew correction). */
export function getTodayUtc(): string {
  return cached;
}

function commit(day: string): string {
  cached = day;
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

async function dateFromOrigin(): Promise<Date | null> {
  if (typeof window === "undefined") return null;
  const url = `${window.location.origin}/`;
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await withTimeout(fetch(url, { method, cache: "no-store" }), 1200);
      const raw = res.headers.get("Date");
      if (!raw) continue;
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    } catch {
      /* try next method */
    }
  }
  return null;
}

async function dateFromWorldTime(): Promise<Date | null> {
  try {
    const res = await withTimeout(
      fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", { cache: "no-store" }),
      1200,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { utc_datetime?: string };
    if (!body.utc_datetime) return null;
    const parsed = new Date(body.utc_datetime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Confirm today's UTC date. Prefers the deployed origin's `Date` header
 * when clock skew is small; falls back to local UTC. WorldTimeAPI is last resort.
 */
export async function syncTodayUtc(): Promise<string> {
  const localNow = Date.now();
  const localDay = utcDateString(new Date(localNow));
  let server = await dateFromOrigin();
  if (!server) server = await dateFromWorldTime();
  if (!server) return commit(localDay);
  const skew = server.getTime() - localNow;
  if (Math.abs(skew) > SKEW_LIMIT_MS) return commit(localDay);
  return commit(utcDateString(new Date(localNow + skew)));
}
