let raf = 0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function cancelPlayScroll(): void {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

function hudBottom(): number {
  const hud = document.querySelector(".hud");
  return hud ? hud.getBoundingClientRect().bottom : 0;
}

/**
 * Keep the current row visible under the sticky HUD without pinning it
 * to a fixed Y. If it is already on-screen with room below, do nothing so
 * the highlight walks down the viewport. Only scroll down when it would
 * cross the lower comfort band.
 */
export function scrollPlayRow(index: number, duration = 360): void {
  const row = document.getElementById(`q-${index}`);
  if (!row) return;

  const topBound = hudBottom() + 10;
  const vh = window.innerHeight;
  const bottomBound = vh - Math.max(110, Math.min(vh * 0.26, 200));
  const rect = row.getBoundingClientRect();

  let delta = 0;
  if (rect.top < topBound) {
    delta = rect.top - topBound;
  } else if (rect.bottom > bottomBound) {
    delta = rect.bottom - bottomBound;
  }

  if (delta < 0 && rect.top >= topBound - 1) {
    delta = 0;
  }

  if (Math.abs(delta) < 2) return;
  animateWindowScroll(window.scrollY + delta, duration);
}

export function scrollTripRow(index: number, duration = 280): void {
  const row = document.getElementById(`q-${index}`);
  if (!row) return;
  const topBound = hudBottom() + 8;
  const vh = window.innerHeight;
  const bottomBound = vh - Math.max(90, vh * 0.18);
  const rect = row.getBoundingClientRect();
  let delta = 0;
  if (rect.top < topBound) delta = rect.top - topBound;
  else if (rect.bottom > bottomBound) delta = rect.bottom - bottomBound;
  if (Math.abs(delta) < 2) return;
  animateWindowScroll(window.scrollY + delta, duration);
}

function animateWindowScroll(dest: number, duration: number): void {
  cancelPlayScroll();
  const vh = window.innerHeight;
  const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
  const to = Math.max(0, Math.min(maxY, dest));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || duration <= 0) {
    window.scrollTo(0, to);
    return;
  }
  const from = window.scrollY;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + (to - from) * easeInOutCubic(t));
    if (t < 1) raf = requestAnimationFrame(tick);
    else raf = 0;
  };
  raf = requestAnimationFrame(tick);
}
