import { type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { bonusUnlocked, formatDuration, formatPct, SCORE_NOTE } from "../game/scoring.ts";
import { captureNodePng, copyOrSavePng, waitForTriviaPainted } from "../game/capture.ts";
import { triviaChime } from "../game/audio.ts";
import { prefersReducedMotion } from "../game/reveal.ts";
import { BrandMark } from "./BrandMark.tsx";
import { DotGraph } from "./DotGraph.tsx";
import { pickTrivia } from "../game/trivia.ts";
import type { PersonalBests, RunResult } from "../types.ts";

interface Props {
  result: RunResult;
  bests: PersonalBests;
  completedDays: string[];
  today: string;
  onHome: () => void;
  onPractice: () => void;
  includeHero?: boolean;
  graph?: ReactNode;
  /** Hold before the simile punchline. Skip uses a shorter beat. */
  holdMs?: number;
}

export function TriviaLine({
  result,
  revealed,
}: {
  result: Pick<RunResult, "accuracy" | "correct" | "total" | "date" | "mode" | "seed">;
  revealed: boolean;
}) {
  const trivia = pickTrivia({
    accuracy: result.accuracy,
    correct: result.correct,
    total: result.total,
    date: result.date,
    mode: result.mode,
    seed: result.seed,
  });

  return (
    <p className={`trivia ${revealed ? "is-in" : "is-wait"}`} aria-live="polite">
      {trivia.prefix}{" "}
      {revealed ? (
        <em className="trivia-target">{trivia.target}</em>
      ) : (
        <span className="trivia-wait" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      )}
    </p>
  );
}

export function ResultsHero({
  result,
  arriving = false,
  triviaRevealed = false,
  children,
}: {
  result: RunResult;
  arriving?: boolean;
  triviaRevealed?: boolean;
  children: ReactNode;
}) {
  const hasBonus = bonusUnlocked(result);
  return (
    <div className={`hero-band ${arriving ? "is-arriving" : ""}`}>
      <div className={`hero-stats-stack ${hasBonus ? "has-bonus" : ""}`}>
        <div className="hero-stat">
          <div className="label">acc</div>
          <div className="value">{formatPct(result.accuracy)}</div>
        </div>
        <div className="hero-stat">
          <div className="label">{hasBonus ? "daily time" : "time"}</div>
          <div className="value">{formatDuration(result.durationMs)}</div>
        </div>
        <div className="hero-stat">
          <div className="label">{hasBonus ? "daily score" : "score"}</div>
          <div className="value">{result.score}</div>
        </div>
        {hasBonus && (
          <div className="hero-stat is-bonus">
            <div className="label">bonus</div>
            <div className="value">{result.bonusRows}</div>
          </div>
        )}
      </div>
      <div className="hero-graph">{children}</div>
      <TriviaLine result={result} revealed={triviaRevealed} />
    </div>
  );
}

export function ResultsScreen({
  result,
  bests,
  onHome,
  onPractice,
  includeHero = true,
  graph,
  holdMs = 420,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const triviaTimer = useRef<number | null>(null);
  const [copied, setCopied] = useState<"image" | "saved" | null>(null);
  const [busy, setBusy] = useState(false);
  const [triviaOn, setTriviaOn] = useState(false);
  const firstMiss =
    result.firstMistake === null ? "none" : `question ${result.firstMistake}`;
  const isDaily = result.mode === "daily";
  const hasBonus = bonusUnlocked(result);
  const baseTotal = result.baseTotal ?? result.total;
  const bestBonus = Math.max(bests.bestBonusRows ?? 0, result.bonusRows ?? 0);
  const filled = result.correctMask.map(() => true);
  const filename = `precisley-${isDaily ? result.date : "practice"}.png`;

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const delay = reduce ? 160 : holdMs;
    triviaTimer.current = window.setTimeout(() => {
      triviaTimer.current = null;
      setTriviaOn(true);
      triviaChime();
    }, delay);
    return () => {
      if (triviaTimer.current != null) window.clearTimeout(triviaTimer.current);
    };
  }, [holdMs]);

  function flash(kind: "image" | "saved") {
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  }

  function cancelTriviaTimer() {
    if (triviaTimer.current != null) {
      window.clearTimeout(triviaTimer.current);
      triviaTimer.current = null;
    }
  }

  async function copyImage() {
    const node = cardRef.current;
    if (!node || busy) return;
    const needReveal = !triviaOn;
    cancelTriviaTimer();
    flushSync(() => {
      setBusy(true);
      if (needReveal) setTriviaOn(true);
    });
    if (needReveal) triviaChime();
    await waitForTriviaPainted(node);
    try {
      const blob = await captureNodePng(node);
      const how = await copyOrSavePng(blob, filename);
      flash(how === "downloaded" ? "saved" : "image");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const heroGraph = graph ?? (
    <DotGraph
      count={result.total}
      filled={filled}
      mask={result.correctMask}
      revealedThrough={result.total - 1}
      activeIndex={-1}
      variant="hero"
      bonusFrom={(result.bonusRows ?? 0) > 0 ? baseTotal : undefined}
    />
  );

  return (
    <div className="results-shell">
      <div className="results-stage">
        <div className="results-card" ref={cardRef}>
          <div className="results-top">
            <BrandMark />
            <div className="hud-meta">
              <span>{isDaily ? `${result.date} UTC` : "practice"}</span>
            </div>
          </div>

          {includeHero && (
            <ResultsHero result={result} triviaRevealed={triviaOn}>
              {heroGraph}
            </ResultsHero>
          )}

          <p className="score-note">
            {result.correct}/{result.total} correct · {SCORE_NOTE}
          </p>

          <div className="stat-grid extra-stats">
            <div className="stat">
              <div className="label">longest success</div>
              <div className="value">{result.longestSuccess}</div>
            </div>
            <div className="stat">
              <div className="label">longest fail</div>
              <div className="value">{result.longestFail}</div>
            </div>
            <div className="stat">
              <div className="label">avg / question</div>
              <div className="value">{formatDuration(result.avgMs)}</div>
            </div>
            <div className="stat">
              <div className="label">pace</div>
              <div className="value">{result.qpm.toFixed(1)} qpm</div>
            </div>
            <div className="stat">
              <div className="label">ending streak</div>
              <div className="value">{result.endStreak}</div>
            </div>
            <div className="stat">
              <div className="label">first mistake</div>
              <div className="value">{firstMiss}</div>
            </div>
            {hasBonus && (
              <>
                <div className="stat">
                  <div className="label">bonus time</div>
                  <div className="value">{formatDuration(result.bonusDurationMs ?? 0)}</div>
                </div>
                <div className="stat">
                  <div className="label">bonus rows</div>
                  <div className="value">{result.bonusRows}</div>
                </div>
              </>
            )}
          </div>

          <div className="stat-grid extra-stats pb-stats">
            <div className="stat">
              <div className="label">{isDaily ? "best score" : "best practice"}</div>
              <div className="value">{bests.bestScore ?? "—"}</div>
            </div>
            <div className="stat">
              <div className="label">{isDaily ? "best accuracy" : "best practice acc"}</div>
              <div className="value">
                {bests.bestAccuracy === null ? "—" : formatPct(bests.bestAccuracy)}
              </div>
            </div>
            <div className="stat">
              <div className="label">{isDaily ? "best daily time (100%)" : "best practice time"}</div>
              <div className="value">
                {bests.bestTimeMs === null ? "—" : formatDuration(bests.bestTimeMs)}
              </div>
            </div>
            {hasBonus && (
              <div className="stat">
                <div className="label">best bonus</div>
                <div className="value">{bestBonus}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="results-actions actions" data-capture="skip">
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy}
          onClick={() => void copyImage()}
        >
          {busy ? "Capturing…" : "Copy image"}
        </button>
        {copied === "image" && <span className="copied">copied</span>}
        {copied === "saved" && <span className="copied">saved</span>}
        <button className="btn" type="button" onClick={onHome}>
          Home
        </button>
        <button className="btn" type="button" onClick={onPractice}>
          Practice
        </button>
      </div>
    </div>
  );
}
