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
            Five digits on <strong>A–E</strong>. That&apos;s the key. It stays up the whole time.
          </p>
          <p>
            Each row hides one. Pick the letter. You have five seconds — when the bar runs out, the
            row stays blank. That&apos;s a miss. Answers lock; you can&apos;t go back.
          </p>
          <p>
            Same puzzle for everyone, every day. Practice if you want another go.
          </p>
          <p className="hint">
            Click or tap A–E, or press 1–5.
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
              <p className="hint">Already played today. Practice won&apos;t overwrite it.</p>
            </>
          ) : (
            <>
              <button className="btn btn-primary" type="button" onClick={() => { unlockAudio(); onStart("daily"); }}>
                Play
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
