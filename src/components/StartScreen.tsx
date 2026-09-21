import { useEffect } from "react";
import type { Mode } from "../types.ts";
import { unlockAudio } from "../game/audio.ts";
import { BrandMark } from "./BrandMark.tsx";
import { DemoPlay } from "./DemoPlay.tsx";

interface Props {
  date: string;
  dailyDone: boolean;
  debugRows: number | null;
  onStart: (mode: Mode) => void;
  onViewResults: () => void;
}

export function StartScreen({ date, dailyDone, debugRows, onStart, onViewResults }: Props) {
  useEffect(() => {
    const arm = () => unlockAudio();
    window.addEventListener("pointerdown", arm, true);
    window.addEventListener("keydown", arm, true);
    return () => {
      window.removeEventListener("pointerdown", arm, true);
      window.removeEventListener("keydown", arm, true);
    };
  }, []);

  return (
    <div className="wrap start">
      <header className="start-head">
        <BrandMark />
        <div className="hud-meta">
          <span>{date} UTC</span>
          {debugRows !== null && <span>debug {debugRows} rows</span>}
        </div>
      </header>

      <div className="start-layout">
        <h1>
          find the
          <span> missing </span>
          number
        </h1>

        <div className="lede">
          <p>
            precisley is a daily attention game. Each day maps five distinct digits (0–9) onto
            letters <strong>A–E</strong>. That mapping is the key. It stays on screen for the whole
            run.
          </p>
          <p>
            Every question shows <strong>four</strong> of those five numbers, shuffled. One number
            from the key is missing. Choose the letter that belongs to the missing number.
          </p>
          <p>
            Play is sequential: one row at a time, with <strong>5 seconds</strong> to answer.
            Miss the window and the row stays blank — counted wrong, locked, and you move on. No
            going back, no skipping ahead, and no correctness until you finish all{" "}
            {debugRows ?? 100} questions. Then the dotted path becomes your results graph.
          </p>
          <p className="hint">
            Desktop: click, or press A–E / 1–5. Mobile: tap the letter buttons. Same puzzle for
            everyone today (UTC date).
          </p>
        </div>

        <DemoPlay />

        <div className="actions">
          {dailyDone ? (
            <>
              <button className="btn btn-primary" type="button" onClick={() => { unlockAudio(); onViewResults(); }}>
                Today&apos;s results
              </button>
              <button className="btn" type="button" onClick={() => { unlockAudio(); onStart("practice"); }}>
                Practice
              </button>
              <p className="hint">Daily already completed — practice does not overwrite it.</p>
            </>
          ) : (
            <>
              <button className="btn btn-primary" type="button" onClick={() => { unlockAudio(); onStart("daily"); }}>
                Start daily
              </button>
              <button className="btn" type="button" onClick={() => { unlockAudio(); onStart("practice"); }}>
                Practice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
