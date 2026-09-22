import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark.tsx";
import { DotGraph } from "./DotGraph.tsx";
import { ResultsScreen } from "./ResultsScreen.tsx";
import {
  LETTERS,
  type AnswerEvent,
  type Letter,
  type PersonalBests,
  type Puzzle,
  type Question,
  type RunResult,
} from "../types.ts";
import { BONUS_LOOKAHEAD, letterFromKey, moreBonusQuestions } from "../game/puzzle.ts";
import { analyzeRun, formatDuration } from "../game/scoring.ts";
import { endlessEnter, keyClick, paceDrop, tone, unlockAudio } from "../game/audio.ts";
import { advanceStreak, prefersReducedMotion, tripDelay, type HeatKind } from "../game/reveal.ts";
import { cancelPlayScroll, scrollPlayRow, scrollTripRow } from "../game/scroll.ts";
import {
  blockWindowSec,
  formatWindowLabel,
  nextTightness,
  rowWindowMs,
  rowWindowSec,
} from "../game/timing.ts";
import { puzzleNumber } from "../game/utcDate.ts";

interface Props {
  puzzle: Puzzle;
  onRunComplete: (result: RunResult) => void;
  bests: PersonalBests;
  completedDays: string[];
  today: string;
  onHome: () => void;
  onPractice: () => void;
  /** DEV: treat the base board as already perfect and enter endless on mount. */
  skipToBonus?: boolean;
}

type View = "play" | "trip" | "results";

export function GameScreen({
  puzzle,
  onRunComplete,
  bests,
  completedDays,
  today,
  onHome,
  onPractice,
  skipToBonus = false,
}: Props) {
  const baseTotal = puzzle.questions.length;
  const skipIn = skipToBonus && puzzle.mode === "daily";
  const startedAt = useRef(performance.now());
  const answersRef = useRef<(AnswerEvent | null)[]>(
    skipIn
      ? puzzle.questions.map((q) => ({ letter: q.answer, at: startedAt.current }))
      : Array(baseTotal).fill(null),
  );
  const questionsRef = useRef<Question[]>(puzzle.questions);
  const bonusPoolRef = useRef<Question[]>([...puzzle.bonus]);
  const bonusGeneratedRef = useRef(puzzle.bonus.length);
  const currentRef = useRef(skipIn ? baseTotal : 0);
  const viewRef = useRef<View>("play");
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const onRunCompleteRef = useRef(onRunComplete);
  onRunCompleteRef.current = onRunComplete;
  const tapeRef = useRef<HTMLDivElement>(null);
  const firstRects = useRef<DOMRect[]>([]);
  const flipAnims = useRef<Animation[]>([]);
  const skippedRef = useRef(false);
  const skipAppliedRef = useRef(false);
  const rowStartedAt = useRef(performance.now());
  const rowRafRef = useRef(0);
  const lockInRef = useRef<(letter: Letter | null) => void>(() => {});
  const dailyEndedAt = useRef<number | null>(null);
  const scoredRef = useRef({ qs: puzzle.questions, n: baseTotal });
  const tightnessRef = useRef(0);

  const [board, setBoard] = useState<Question[]>(puzzle.questions);
  const [current, setCurrent] = useState(skipIn ? baseTotal : 0);
  const [answers, setAnswers] = useState<(AnswerEvent | null)[]>(() =>
    skipIn
      ? puzzle.questions.map((q) => ({ letter: q.answer, at: startedAt.current }))
      : Array(baseTotal).fill(null),
  );
  const [elapsed, setElapsed] = useState(0);
  const [view, setView] = useState<View>("play");
  const [result, setResult] = useState<RunResult | null>(null);
  const [tripAt, setTripAt] = useState(-1);
  const [okStreak, setOkStreak] = useState(0);
  const [badStreak, setBadStreak] = useState(0);
  const [heatKind, setHeatKind] = useState<HeatKind | "">("");
  const [paceCue, setPaceCue] = useState<number | null>(null);
  const [endlessCue, setEndlessCue] = useState(skipIn);
  const [inBonus, setInBonus] = useState(skipIn);
  const [tightness, setTightness] = useState(0);

  useEffect(() => {
    unlockAudio();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => scrollPlayRow(skipIn ? baseTotal : 0, 0));
    const id = window.setInterval(() => {
      if (viewRef.current !== "play") return;
      if (dailyEndedAt.current != null) {
        setElapsed(Math.max(0, dailyEndedAt.current - startedAt.current));
        return;
      }
      setElapsed(performance.now() - startedAt.current);
    }, 32);
    return () => {
      window.clearInterval(id);
      cancelPlayScroll();
    };
  }, []);

  const snapshotTape = () => {
    const nodes = tapeRef.current?.querySelectorAll("i");
    firstRects.current = nodes ? [...nodes].map((n) => n.getBoundingClientRect()) : [];
  };

  const stopRowClock = () => {
    if (rowRafRef.current) {
      cancelAnimationFrame(rowRafRef.current);
      rowRafRef.current = 0;
    }
  };

  const paintBar = (remain: number) => {
    const el = document.querySelector<HTMLElement>(".q-row.is-current .row-timer");
    if (!el) return;
    const clamped = Math.max(0, Math.min(1, remain));
    el.style.setProperty("--remain", String(clamped));
    el.classList.toggle("is-urgent", clamped > 0 && clamped <= 0.2);
  };

  const startRowClock = () => {
    stopRowClock();
    rowStartedAt.current = performance.now();
    const i = currentRef.current;
    const windowMs = rowWindowMs(i, puzzle.mode, baseTotal, tightnessRef.current);
    paintBar(1);
    const tick = (now: number) => {
      if (viewRef.current !== "play") return;
      if (i >= questionsRef.current.length || answersRef.current[i]) return;
      const elapsedMs = now - rowStartedAt.current;
      paintBar(1 - elapsedMs / windowMs);
      if (elapsedMs >= windowMs) {
        lockInRef.current(null);
        return;
      }
      rowRafRef.current = requestAnimationFrame(tick);
    };
    rowRafRef.current = requestAnimationFrame(tick);
  };

  const goToResults = useCallback(() => {
    snapshotTape();
    setTripAt(scoredRef.current.n);
    setHeatKind("");
    viewRef.current = "results";
    setView("results");
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  const skipTrip = useCallback(() => {
    if (viewRef.current !== "trip") return;
    skippedRef.current = true;
    cancelledRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    goToResults();
  }, [goToResults]);

  const runTrip = useCallback(() => {
    cancelledRef.current = false;
    skippedRef.current = false;
    viewRef.current = "trip";
    setView("trip");
    let i = 0;
    let okS = 0;
    let badS = 0;
    const qs = scoredRef.current.qs;
    const n = scoredRef.current.n;

    const step = () => {
      if (cancelledRef.current) return;
      if (i >= n) {
        setTripAt(n);
        timerRef.current = window.setTimeout(() => {
          if (!cancelledRef.current) goToResults();
        }, prefersReducedMotion() ? 60 : 280);
        return;
      }

      const q = qs[i]!;
      const picked = answersRef.current[i]?.letter;
      const ok = picked === q.answer;
      const next = advanceStreak(okS, badS, ok);
      okS = next.okS;
      badS = next.badS;
      const kind = next.kind;
      const delay = tripDelay(okS, badS, kind === "break");

      setTripAt(i);
      setOkStreak(okS);
      setBadStreak(badS);
      setHeatKind(kind);
      tone(kind === "break" ? "break" : kind, kind === "ok" ? okS : badS);
      requestAnimationFrame(() => {
        scrollTripRow(i, prefersReducedMotion() ? 0 : Math.min(240, delay));
      });

      i += 1;
      timerRef.current = window.setTimeout(step, delay);
    };

    timerRef.current = window.setTimeout(step, prefersReducedMotion() ? 30 : 120);
  }, [goToResults]);

  useLayoutEffect(() => {
    if (view !== "results") return;
    const dots = tapeRef.current?.querySelectorAll("i");
    const firsts = firstRects.current;
    if (!dots || dots.length === 0 || firsts.length === 0) return;
    const reduce = prefersReducedMotion();
    flipAnims.current = [];
    dots.forEach((el, i) => {
      const first = firsts[i];
      if (!first) return;
      const last = el.getBoundingClientRect();
      const dx = first.left + first.width / 2 - (last.left + last.width / 2);
      const dy = first.top + first.height / 2 - (last.top + last.height / 2);
      const sx = last.width === 0 ? 1 : first.width / last.width;
      const sy = last.height === 0 ? 1 : first.height / last.height;
      const anim = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transform: "none" },
        ],
        {
          duration: reduce ? 0 : 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      );
      anim.onfinish = () => anim.cancel();
      flipAnims.current.push(anim);
    });
  }, [view]);

  const takeBonus = (n: number) => {
    if (n <= 0) return;
    while (bonusPoolRef.current.length < n) {
      const extra = moreBonusQuestions(puzzle, bonusGeneratedRef.current);
      bonusGeneratedRef.current += extra.length;
      bonusPoolRef.current.push(...extra);
    }
    const next = bonusPoolRef.current.splice(0, n);
    questionsRef.current = [...questionsRef.current, ...next];
    setBoard(questionsRef.current);
    answersRef.current = [...answersRef.current, ...Array(next.length).fill(null)];
    setAnswers((prev) => [...prev, ...Array(next.length).fill(null)]);
  };

  const ensureLookahead = () => {
    const need = currentRef.current + BONUS_LOOKAHEAD + 1 - questionsRef.current.length;
    if (need > 0) takeBonus(need);
  };

  const finishPlay = useCallback(() => {
    stopRowClock();
    const ended = performance.now();
    const scoredN = dailyEndedAt.current != null ? currentRef.current : baseTotal;
    const scoredQs = questionsRef.current.slice(0, scoredN);
    questionsRef.current = scoredQs;
    setBoard(scoredQs);
    const filled = scoredQs.map((_, i) => {
      return answersRef.current[i] ?? { letter: null, at: ended };
    });
    answersRef.current = filled;
    setAnswers(filled);
    scoredRef.current = { qs: scoredQs, n: scoredN };
    const next = analyzeRun({ ...puzzle, questions: scoredQs }, filled, startedAt.current, ended, {
      baseTotal,
      dailyEndedAt: dailyEndedAt.current,
    });
    setElapsed(next.durationMs);
    setResult(next);
    onRunCompleteRef.current(next);
    runTrip();
  }, [baseTotal, puzzle, runTrip]);

  const enterBonus = useCallback(() => {
    const at = performance.now();
    dailyEndedAt.current = at;
    tightnessRef.current = 0;
    setTightness(0);
    setInBonus(true);
    setEndlessCue(true);
    setElapsed(Math.max(0, at - startedAt.current));
    unlockAudio();
    endlessEnter();
    ensureLookahead();
    const filled = puzzle.questions.map((_, i) => answersRef.current[i]!);
    const checkpoint = analyzeRun({ ...puzzle, questions: puzzle.questions }, filled, startedAt.current, at, {
      baseTotal,
      dailyEndedAt: at,
    });
    onRunCompleteRef.current(checkpoint);
  }, [baseTotal, puzzle]);

  useLayoutEffect(() => {
    if (!skipIn || skipAppliedRef.current) return;
    skipAppliedRef.current = true;
    enterBonus();
    requestAnimationFrame(() => {
      scrollPlayRow(baseTotal, prefersReducedMotion() ? 0 : 380);
    });
  }, [skipIn, enterBonus, baseTotal]);

  const lockIn = useCallback(
    (letter: Letter | null) => {
      if (viewRef.current !== "play") return;
      const i = currentRef.current;
      const q = questionsRef.current[i];
      if (!q) return;
      if (answersRef.current[i]) return;
      const inBonusNow = i >= baseTotal;
      const correct = letter !== null && letter === q.answer;

      if (inBonusNow && !correct) {
        stopRowClock();
        finishPlay();
        return;
      }

      stopRowClock();
      if (letter !== null) {
        unlockAudio();
        keyClick();
      }
      const ev: AnswerEvent = { letter, at: performance.now() };
      answersRef.current[i] = ev;
      setAnswers((prev) => {
        const copy = prev.slice();
        copy[i] = ev;
        return copy;
      });
      const nextIndex = i + 1;
      currentRef.current = nextIndex;
      setCurrent(nextIndex);

      const prevTight = tightnessRef.current;
      const nextTight = nextTightness(prevTight, correct);

      if (puzzle.mode === "daily" && nextIndex === baseTotal) {
        const perfect = puzzle.questions.every((qq, idx) => answersRef.current[idx]?.letter === qq.answer);
        if (perfect) {
          enterBonus();
          requestAnimationFrame(() => {
            scrollPlayRow(nextIndex, prefersReducedMotion() ? 0 : 380);
          });
          return;
        }
        finishPlay();
        return;
      }

      if (nextIndex >= questionsRef.current.length) {
        finishPlay();
        return;
      }

      tightnessRef.current = nextTight;
      setTightness(nextTight);

      if (puzzle.mode === "daily" && nextIndex < baseTotal) {
        const prevBlock = blockWindowSec(i, "daily", baseTotal);
        const nextBlock = blockWindowSec(nextIndex, "daily", baseTotal);
        if (nextBlock < prevBlock) {
          const prevSec = rowWindowSec(i, "daily", baseTotal, prevTight);
          const nextSec = rowWindowSec(nextIndex, "daily", baseTotal, nextTight);
          if (nextSec < prevSec) {
            unlockAudio();
            paceDrop();
            setPaceCue(nextSec);
          }
        }
      }

      if (nextIndex >= baseTotal && puzzle.mode === "daily") {
        ensureLookahead();
      }

      requestAnimationFrame(() => {
        scrollPlayRow(nextIndex, prefersReducedMotion() ? 0 : 380);
      });
    },
    [baseTotal, enterBonus, finishPlay, puzzle.mode, puzzle.questions],
  );
  lockInRef.current = lockIn;

  useLayoutEffect(() => {
    if (view !== "play") {
      stopRowClock();
      return;
    }
    if (current >= board.length) return;
    if (answersRef.current[current]) return;
    startRowClock();
    return () => stopRowClock();
  }, [board.length, current, view]);

  const choose = useCallback(
    (letter: Letter) => {
      lockIn(letter);
    },
    [lockIn],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (viewRef.current === "trip") {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          skipTrip();
        }
        return;
      }
      if (viewRef.current !== "play") return;
      const letter = letterFromKey(e.key);
      if (!letter) return;
      e.preventDefault();
      choose(letter);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, skipTrip]);

  useEffect(() => {
    if (paceCue === null) return;
    const id = window.setTimeout(() => setPaceCue(null), 1400);
    return () => window.clearTimeout(id);
  }, [paceCue]);

  useEffect(() => {
    if (!endlessCue) return;
    const id = window.setTimeout(() => setEndlessCue(false), 1400);
    return () => window.clearTimeout(id);
  }, [endlessCue]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      stopRowClock();
    };
  }, []);

  const scoredN = result?.total ?? scoredRef.current.n;
  const heat = heatKind === "ok" ? okStreak : heatKind === "bad" ? badStreak : heatKind === "break" ? 8 : 0;
  const frozenTime = result?.durationMs ?? elapsed;
  const comboValue =
    heatKind === "break" ? "broken" : heatKind === "ok" ? String(okStreak) : heatKind === "bad" ? String(badStreak) : "";
  const comboLabel =
    heatKind === "break" ? "streak broken" : heatKind === "ok" ? "combo" : heatKind === "bad" ? "miss" : "";
  const bonusCombo = heatKind === "ok" && inBonus && tripAt >= baseTotal;
  const bonusWash = inBonus && (view !== "trip" || tripAt >= baseTotal);
  const filledFlags = answers.map((a) => Boolean(a));
  const mask = result?.correctMask ?? null;
  const graphCount = view === "play" ? board.length : scoredN;
  const revealedThrough = view === "results" ? scoredN - 1 : view === "play" ? -1 : tripAt;
  const windowSec = rowWindowSec(current, puzzle.mode, baseTotal, tightness);
  const bonusFrom =
    puzzle.mode !== "daily"
      ? undefined
      : view === "results" && (result?.bonusRows ?? 0) === 0
        ? undefined
        : baseTotal;
  const progressText = (() => {
    if (view === "trip") {
      const n = scoredN;
      if (inBonus || (result?.bonusRows ?? 0) > 0 || tripAt >= baseTotal) {
        const bonusAt = Math.max(0, Math.min(tripAt + 1, n) - baseTotal);
        return bonusAt > 0 ? `bonus ${bonusAt}` : `${Math.min(tripAt + 1, baseTotal)} / ${baseTotal}`;
      }
      return `${Math.min(tripAt + 1, n)} / ${n}`;
    }
    if (inBonus || current >= baseTotal) {
      return `bonus ${Math.max(0, current - baseTotal)}`;
    }
    return `${Math.min(current, baseTotal)} / ${baseTotal}`;
  })();

  const graph = (
    <DotGraph
      count={graphCount}
      filled={filledFlags}
      mask={mask}
      revealedThrough={revealedThrough}
      activeIndex={view === "trip" ? tripAt : -1}
      variant={view === "play" || view === "trip" ? "hud" : "hero"}
      tapeRef={tapeRef}
      bonusFrom={bonusFrom}
    />
  );

  if (view === "results" && result) {
    return (
      <div className="playfield">
        <ResultsScreen
          result={result}
          bests={bests}
          completedDays={completedDays}
          today={today}
          onHome={onHome}
          onPractice={onPractice}
          graph={graph}
          holdMs={skippedRef.current ? 280 : 420}
        />
      </div>
    );
  }

  const visibleBoard = view === "play" ? board : scoredRef.current.qs;

  return (
    <div
      className={`playfield ${heatKind === "ok" ? "is-ok" : heatKind === "bad" ? "is-bad" : heatKind === "break" ? "is-break" : ""} ${bonusWash ? "is-endless" : ""}`}
      style={{ ["--heat" as string]: String(heat) }}
    >
      <div className="wrap game">
        <header className="hud">
          <div className="hud-top">
            <BrandMark />
            <div className="hud-meta">
              {view === "trip" ? (
                <button className="btn" type="button" onClick={skipTrip}>
                  Skip
                </button>
              ) : puzzle.mode === "daily" ? (
                <>
                  <span>{puzzle.date}</span>
                  <span>UTC</span>
                  <span>#{puzzleNumber(puzzle.date)}</span>
                </>
              ) : (
                <span>practice</span>
              )}
            </div>
          </div>

          <div className="hud-clock">
            <div className="timer" aria-live="off">
              {formatDuration(frozenTime)}
            </div>
            <div className="progress-label">
              {view === "play" && (
                <span
                  className={`pace-chip ${paceCue !== null ? "is-drop" : ""} ${inBonus ? "is-bonus" : ""}`}
                  aria-label={inBonus ? `Endless row timer ${windowSec} seconds` : `Row timer ${windowSec} seconds`}
                >
                  {inBonus ? (
                    <>
                      <span className="pace-inf" aria-hidden>
                        ∞
                      </span>
                      {formatWindowLabel(windowSec)}
                    </>
                  ) : (
                    formatWindowLabel(windowSec)
                  )}
                </span>
              )}
              <span>{progressText}</span>
            </div>
          </div>

          <table className="key-table" aria-label="Answer key">
            <tbody>
              <tr>
                <th>Key</th>
                {puzzle.key.numbers.map((n, i) => (
                  <td className="key-num" key={`n-${i}`}>
                    {n}
                  </td>
                ))}
              </tr>
              <tr>
                <th>Answer</th>
                {puzzle.key.letters.map((l) => (
                  <td key={l}>{l}</td>
                ))}
              </tr>
            </tbody>
          </table>

          <div className="key-mobile" aria-label="Answer key">
            {puzzle.key.letters.map((l, i) => (
              <div className="key-chip" key={l}>
                <span className="k-l">{l}</span>
                <span className="k-n">{puzzle.key.numbers[i]}</span>
              </div>
            ))}
          </div>

          {graph}

          <div className="col-head" aria-hidden>
            <span></span>
            <span>No</span>
            <span>Question</span>
            {LETTERS.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </header>

        <div className="list" role="list">
          {visibleBoard.map((q, i) => {
            const picked = answers[i]?.letter ?? null;
            const onTrip = view === "trip";
            const revealed = onTrip && i <= tripAt;
            const visiting = onTrip && i === tripAt;
            const ok = revealed && Boolean(mask?.[i]);
            const bad = revealed && mask !== null && !mask[i] && i < baseTotal;
            const isCurrent = !onTrip && i === current;
            const isLocked = !onTrip && i < current;
            const isFuture = !onTrip && i > current;
            const isBonusRow = i >= baseTotal;

            const rowClass = [
              "q-row",
              isCurrent ? "is-current" : "",
              isLocked ? "is-locked" : "",
              isFuture ? "is-future" : "",
              visiting ? "is-visiting" : "",
              ok ? "is-ok" : "",
              bad ? "is-bad" : "",
              isBonusRow ? "is-bonus" : "",
              visiting && heatKind === "ok" ? "is-ok-hit" : "",
              visiting && heatKind === "bad" ? "is-bad-hit" : "",
              visiting && heatKind === "break" ? "is-break-hit" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={q.id}
                id={`q-${i}`}
                className={rowClass}
                role="listitem"
                aria-current={isCurrent || visiting ? "true" : undefined}
                aria-label={`Question ${q.id}, numbers ${q.shown.join(" ")}`}
              >
                {isCurrent && (
                  <div className={`row-timer ${paceCue !== null ? "is-drop" : ""}`} aria-hidden />
                )}
                <div className="path" aria-hidden>
                  <span className="node" />
                </div>
                <div className="no">{q.id}</div>
                <div className="digits">
                  {q.shown.map((n, di) => (
                    <span key={di}>{n}</span>
                  ))}
                </div>
                <div className="choices" role={isCurrent ? "radiogroup" : undefined}>
                  {LETTERS.map((l) => {
                    const isPicked = picked === l;
                    const isTruth = revealed && l === q.answer && picked !== q.answer;
                    return (
                      <button
                        key={l}
                        type="button"
                        className={`choice ${isPicked ? "is-picked" : ""} ${isTruth ? "is-truth" : ""}`}
                        disabled={!isCurrent}
                        tabIndex={isCurrent ? 0 : -1}
                        aria-label={`Answer ${l}`}
                        aria-pressed={isPicked}
                        onPointerDown={(e) => {
                          if (!isCurrent) return;
                          if (e.pointerType === "mouse" && e.button !== 0) return;
                          e.preventDefault();
                          choose(l);
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {view === "trip" && comboValue && (
        <div className={`combo-readout is-${heatKind}${bonusCombo ? " is-bonus-combo" : ""}`} aria-hidden>
          <span>{comboLabel}</span>
          <strong>{comboValue}</strong>
        </div>
      )}

      {view === "play" && paceCue !== null && (
        <div className="pace-drop" aria-live="polite">
          <span>Timeout</span>
          <strong>{formatWindowLabel(paceCue)}</strong>
        </div>
      )}

      {view === "play" && endlessCue && (
        <div className="pace-drop is-endless" aria-live="polite">
          <span>endless</span>
          <strong>bonus</strong>
        </div>
      )}
    </div>
  );
}
