import { useEffect, useRef, useState } from "react";
import { LETTERS, type Letter, type Puzzle } from "../types.ts";
import { DEMO_ROWS, DEMO_SEED, demoPuzzle } from "../game/puzzle.ts";
import { analyzeRun, formatDuration, formatPct } from "../game/scoring.ts";
import { advanceStreak, prefersReducedMotion, tripDelay, type HeatKind } from "../game/reveal.ts";
import { isAudioUnlocked, keyClick, onAudioUnlocked, tone, triviaChime } from "../game/audio.ts";
import { DotGraph } from "./DotGraph.tsx";
import { TriviaLine } from "./ResultsScreen.tsx";
import type { RunResult } from "../types.ts";

type BandId = "perfect" | "high" | "mid" | "messy" | "disaster";

const BANDS: { id: BandId; min: number; max: number; weight: number }[] = [
  { id: "perfect", min: 10, max: 10, weight: 18 },
  { id: "high", min: 8, max: 9, weight: 24 },
  { id: "mid", min: 6, max: 7, weight: 22 },
  { id: "messy", min: 3, max: 5, weight: 20 },
  { id: "disaster", min: 0, max: 2, weight: 16 },
];

function demoSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] || Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
}

function pickCorrectCount(): number {
  const totalW = BANDS.reduce((s, b) => s + b.weight, 0);
  let roll = Math.random() * totalW;
  const band = BANDS.find((b) => {
    roll -= b.weight;
    return roll < 0;
  }) ?? BANDS[2]!;
  return band.min + Math.floor(Math.random() * (band.max - band.min + 1));
}

function wrongLetter(answer: Letter): Letter {
  const idx = LETTERS.indexOf(answer);
  const offset = 1 + Math.floor(Math.random() * (LETTERS.length - 1));
  return LETTERS[(idx + offset) % LETTERS.length]!;
}

function makeDemoRun(): { puzzle: Puzzle; picks: Letter[]; result: RunResult } {
  const puzzle = demoPuzzle(demoSeed());
  const n = puzzle.questions.length;
  const correctN = Math.max(0, Math.min(n, pickCorrectCount()));
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  const ok = new Set(order.slice(0, correctN));
  const picks = puzzle.questions.map((q, i) => (ok.has(i) ? q.answer : wrongLetter(q.answer)));
  const answers = picks.map((letter, i) => ({ letter, at: (i + 1) * 480 }));
  const result = analyzeRun(puzzle, answers, 0, n * 480);
  return { puzzle, picks, result };
}

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export function DemoPlay() {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(() =>
    reduce
      ? (() => {
          const puzzle = demoPuzzle(DEMO_SEED);
          const picks = puzzle.questions.map((q, i) =>
            i < 7 ? q.answer : wrongLetter(q.answer),
          );
          const answers = picks.map((letter, i) => ({ letter, at: (i + 1) * 480 }));
          return {
            puzzle,
            picks,
            result: analyzeRun(puzzle, answers, 0, DEMO_ROWS * 480),
          };
        })()
      : makeDemoRun(),
  );
  const { puzzle, picks, result } = run;
  const total = puzzle.questions.length;

  const [phase, setPhase] = useState<"play" | "trip" | "results">("play");
  const [triviaOn, setTriviaOn] = useState(false);
  const [current, setCurrent] = useState(0);
  const [filled, setFilled] = useState(0);
  const [tripAt, setTripAt] = useState(-1);
  const [heatKind, setHeatKind] = useState<HeatKind | "">("");
  const [okStreak, setOkStreak] = useState(0);
  const [badStreak, setBadStreak] = useState(0);
  const liveSound = useRef(isAudioUnlocked());
  const pendingSound = useRef(false);

  useEffect(() => {
    if (isAudioUnlocked()) liveSound.current = true;
    return onAudioUnlocked(() => {
      pendingSound.current = true;
    });
  }, []);

  useEffect(() => {
    if (reduce) {
      setPhase("play");
      setCurrent(3);
      setFilled(3);
      setTripAt(-1);
      setTriviaOn(false);
      return;
    }

    let cancelled = false;
    let timer = 0;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    async function loop() {
      while (!cancelled) {
        if (pendingSound.current || isAudioUnlocked()) {
          liveSound.current = true;
          pendingSound.current = false;
        }
        const sound = liveSound.current;

        const next = makeDemoRun();
        setRun(next);
        setPhase("play");
        setCurrent(0);
        setFilled(0);
        setTripAt(-1);
        setHeatKind("");
        setOkStreak(0);
        setBadStreak(0);
        setTriviaOn(false);
        await wait(640);
        if (cancelled) return;

        const { puzzle: pz, picks: pk } = next;
        const n = pz.questions.length;

        for (let i = 0; i < n; i++) {
          if (cancelled) return;
          setCurrent(i);
          await wait(520);
          if (cancelled) return;
          setFilled(i + 1);
          setCurrent(i + 1);
          if (sound) keyClick();
          await wait(200);
        }

        setPhase("trip");
        let okS = 0;
        let badS = 0;
        await wait(420);
        for (let i = 0; i < n; i++) {
          if (cancelled) return;
          const correct = pk[i] === pz.questions[i]!.answer;
          const streak = advanceStreak(okS, badS, correct);
          okS = streak.okS;
          badS = streak.badS;
          setTripAt(i);
          setHeatKind(streak.kind);
          setOkStreak(okS);
          setBadStreak(badS);
          if (sound) {
            tone(streak.kind === "break" ? "break" : streak.kind, streak.kind === "ok" ? okS : badS);
          }
          await wait(tripDelay(okS, badS, streak.kind === "break"));
        }

        setPhase("results");
        await wait(400);
        if (cancelled) return;
        setTriviaOn(true);
        if (sound) triviaChime();
        await wait(1800 + Math.floor(Math.random() * 700));
      }
    }

    void loop();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reduce]);

  const heat = heatKind === "ok" ? okStreak : heatKind === "bad" ? badStreak : heatKind === "break" ? 8 : 0;
  const comboValue =
    heatKind === "break" ? "broken" : heatKind === "ok" ? String(okStreak) : heatKind === "bad" ? String(badStreak) : "";
  const filledFlags = Array.from({ length: total }, (_, i) => i < filled || phase !== "play");
  const revealedThrough = phase === "results" ? total - 1 : phase === "play" ? -1 : tripAt;

  return (
    <aside
      className={`demo ${phase === "results" ? "is-graph" : ""}`}
      style={{ ["--heat" as string]: String(heat) }}
      aria-label="precisley demo of a 10-question run and result path"
    >
      <div className="demo-kicker">sample · 10 rows</div>
      <div className="demo-key" aria-hidden>
        {puzzle.key.letters.map((l, i) => (
          <span key={`${puzzle.seed}-${l}`}>
            <b>{puzzle.key.numbers[i]}</b>
            {l}
          </span>
        ))}
      </div>

      <DotGraph
        count={total}
        filled={filledFlags}
        mask={result.correctMask}
        revealedThrough={revealedThrough}
        activeIndex={phase === "trip" ? tripAt : -1}
        variant={phase === "results" ? "hero" : "hud"}
      />

      {(phase === "play" || phase === "trip") && (
        <div className="demo-board list">
          {puzzle.questions.map((q, i) => {
            const picked = filled > i ? picks[i]! : null;
            const onTrip = phase === "trip";
            const revealed = onTrip && i <= tripAt;
            const visiting = onTrip && i === tripAt;
            const ok = revealed && picked === q.answer;
            const bad = revealed && picked !== q.answer;
            const isCurrent = !onTrip && i === current && filled <= i;
            const isLocked = !onTrip && i < filled;
            const isFuture = !onTrip && i > current;

            const rowClass = [
              "q-row",
              isCurrent ? "is-current" : "",
              isLocked ? "is-locked" : "",
              isFuture ? "is-future" : "",
              visiting ? "is-visiting" : "",
              ok ? "is-ok" : "",
              bad ? "is-bad" : "",
              visiting && heatKind === "ok" ? "is-ok-hit" : "",
              visiting && heatKind === "bad" ? "is-bad-hit" : "",
              visiting && heatKind === "break" ? "is-break-hit" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={`${puzzle.seed}-${q.id}`} className={rowClass} aria-hidden>
                {isCurrent && <div className="row-timer" aria-hidden />}
                <div className="path">
                  <span className="node" />
                </div>
                <div className="no">{q.id}</div>
                <div className="digits">
                  {q.shown.map((n, di) => (
                    <span key={di}>{n}</span>
                  ))}
                </div>
                <div className="choices">
                  {LETTERS.map((l) => {
                    const isPicked = picked === l;
                    const isTruth = revealed && l === q.answer && picked !== q.answer;
                    return (
                      <span
                        key={l}
                        className={`choice ${isPicked ? "is-picked" : ""} ${isTruth ? "is-truth" : ""}`}
                      >
                        {l}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {phase === "trip" && comboValue && (
        <div className={`demo-combo is-${heatKind}`}>
          {heatKind === "break" ? "streak broken" : heatKind === "ok" ? `combo ${comboValue}` : `miss ${comboValue}`}
        </div>
      )}

      {phase === "results" && (
        <div className="demo-results">
          <strong>{formatPct(result.accuracy)}</strong>
          <span>{formatDuration(result.durationMs)}</span>
          <span>
            {result.correct}/{result.total}
          </span>
          <TriviaLine result={result} revealed={triviaOn} />
        </div>
      )}
    </aside>
  );
}
