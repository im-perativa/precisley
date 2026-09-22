let ctx: AudioContext | null = null;
let enabled = true;
let clickNoise: AudioBuffer | null = null;
let unlocked = false;
const unlockListeners = new Set<() => void>();

function markUnlocked(): void {
  if (unlocked) return;
  unlocked = true;
  unlockListeners.forEach((cb) => cb());
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (clickNoise && clickNoise.sampleRate === ac.sampleRate) return clickNoise;
  const len = Math.floor(ac.sampleRate * 0.022);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let s = 0xc0ffee;
  for (let i = 0; i < len; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    data[i] = (s / 0xffffffff) * 2 - 1;
    data[i]! *= Math.exp(-i / (len * 0.1));
  }
  clickNoise = buffer;
  return buffer;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** Fires once AudioContext is running (and immediately if already unlocked). */
export function onAudioUnlocked(cb: () => void): () => void {
  unlockListeners.add(cb);
  if (unlocked) cb();
  return () => unlockListeners.delete(cb);
}

export function unlockAudio(): void {
  const ac = audio();
  if (!ac) return;
  if (ac.state === "running") {
    markUnlocked();
    return;
  }
  void ac.resume().then(() => {
    if (ac.state === "running") markUnlocked();
  });
}

/** Identical mechanical click every press — no pitch/timing jitter. */
export function keyClick(): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const vol = 0.13;

  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2100;
  bp.Q.value = 0.85;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(vol, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);
  noise.connect(bp);
  bp.connect(ng);
  ng.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.03);

  const thock = ac.createOscillator();
  thock.type = "sine";
  thock.frequency.value = 190;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 780;
  const tg = ac.createGain();
  tg.gain.setValueAtTime(vol * 0.5, now);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
  thock.connect(lp);
  lp.connect(tg);
  tg.connect(ac.destination);
  thock.start(now);
  thock.stop(now + 0.05);

  const up = ac.createOscillator();
  up.type = "triangle";
  up.frequency.value = 2450;
  const ug = ac.createGain();
  const tUp = now + 0.032;
  ug.gain.setValueAtTime(0.0001, now);
  ug.gain.setValueAtTime(vol * 0.2, tUp);
  ug.gain.exponentialRampToValueAtTime(0.0001, tUp + 0.016);
  up.connect(ug);
  ug.connect(ac.destination);
  up.start(tUp);
  up.stop(tUp + 0.022);
}

export function tone(kind: "ok" | "bad" | "break", intensity: number): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);

  const i = Math.max(1, Math.min(20, intensity));
  if (kind === "ok") {
    osc.type = "triangle";
    osc.frequency.value = 520 + i * 28;
    filter.frequency.value = 1800;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03 + i * 0.004, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07 + i * 0.004);
    osc.start(now);
    osc.stop(now + 0.1 + i * 0.004);
  } else if (kind === "bad") {
    osc.type = "square";
    osc.frequency.value = 180 - i * 4;
    filter.type = "lowpass";
    filter.frequency.value = 700;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04 + i * 0.005, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12 + i * 0.01);
    osc.start(now);
    osc.stop(now + 0.14 + i * 0.01);
  } else {
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

/** Soft two-note sparkle for the trivia punchline — not a key click. */
export function triviaChime(): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const ping = (freq: number, at: number, dur: number, peak: number) => {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  };
  ping(784, now, 0.09, 0.045);
  ping(1175, now + 0.068, 0.16, 0.05);
}

/** Short tighten cue when the daily row window drops. */
export function paceDrop(): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const blip = (freq: number, at: number) => {
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.04, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(at);
    osc.stop(at + 0.11);
  };
  blip(660, now);
  blip(880, now + 0.07);
}
