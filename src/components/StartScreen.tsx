import { useEffect } from "react";
import type { Mode } from "../types.ts";
import { unlockAudio } from "../game/audio.ts";
import { BrandMark } from "./BrandMark.tsx";
import { DemoPlay } from "./DemoPlay.tsx";

interface Props {
  date: string;
  clockReady: boolean;
  dailyDone: boolean;
  debugRows: number | null;
  onStart: (mode: Mode) => void;
  onStartEndlessDev: () => void;
  onViewResults: () => void;
}

export function StartScreen({
  date,
  clockReady,
  dailyDone,
  debugRows,
  onStart,
  onStartEndlessDev,
  onViewResults,
}: Props) {
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
          <span>{clockReady ? `${date} UTC` : "syncing UTC…"}</span>
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
            <strong>Five</strong> digits are mapped to letter <strong>A–E</strong>.
          </p>
          <p>
            Each row hides one digit. Pick the letter associated with the missing digit, be <strong>precise</strong>.
          </p>
          <p>
            Same 60-row puzzle for everyone, every day. Timeout decreases every 10 rows so <strong>stay sharp</strong>.
            A perfect board opens <strong className="lede-endless">bonus endless</strong> mode.
          </p>
          <p className="hint">
            Desktop: Click the answer button, or press A–E / 1–5 on keyboard. Mobile: Tap the letters.
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
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                type="button"
                disabled={!clockReady}
                onClick={() => {
                  unlockAudio();
                  onStart("daily");
                }}
              >
                Play
              </button>
              <button className="btn" type="button" onClick={() => { unlockAudio(); onStart("practice"); }}>
                Practice
              </button>
            </>
          )}
          {/* DEV only: jump today's daily seed into endless without playing the 60. */}
          {import.meta.env.DEV && (
            <button
              className="btn"
              type="button"
              disabled={!clockReady}
              onClick={() => {
                unlockAudio();
                onStartEndlessDev();
              }}
            >
              Endless (dev)
            </button>
          )}
          {dailyDone && <p className="hint">Already played today. Practice won&apos;t overwrite it.</p>}
        </div>
      </div>

      <footer className="start-foot">
        <a
          href="https://github.com/im-perativa/precisley"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            className="start-foot-mark"
            viewBox="0 0 16 16"
            width="15"
            height="15"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
            />
          </svg>
          im-perativa
        </a>
      </footer>
    </div>
  );
}
