import { useCallback, useEffect, useMemo, useState } from "react";
import { StartScreen } from "./components/StartScreen.tsx";
import { GameScreen } from "./components/GameScreen.tsx";
import { ResultsScreen } from "./components/ResultsScreen.tsx";
import { dailyPuzzle, debugRowCount, practicePuzzle, rowCount } from "./game/puzzle.ts";
import { getTodayUtc, syncTodayUtc } from "./game/utcDate.ts";
import { getDailyResult, loadState, recordRun } from "./game/storage.ts";
import type { Mode, Phase, Puzzle, RunResult } from "./types.ts";

export default function App() {
  const [today, setToday] = useState(() => getTodayUtc());
  const debugRows = useMemo(() => debugRowCount(), []);
  const count = useMemo(() => rowCount(), []);
  const initial = useMemo(() => loadState(), []);

  const [phase, setPhase] = useState<Phase>("start");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<RunResult | null>(() => getDailyResult(getTodayUtc()));
  const [bests, setBests] = useState(initial.bests);
  const [completedDays, setCompletedDays] = useState(initial.completedDays);
  const [session, setSession] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void syncTodayUtc().then((day) => {
      if (!cancelled) setToday(day);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "start") return;
    setResult(getDailyResult(today));
  }, [today, phase]);

  const persist = useCallback((run: RunResult) => {
    const state = recordRun(run);
    setBests(state.bests);
    setCompletedDays(state.completedDays);
    setResult(run);
  }, []);

  function start(mode: Mode) {
    if (mode === "daily") {
      const existing = getDailyResult(today);
      if (existing) {
        setResult(existing);
        setPhase("results");
        return;
      }
      setPuzzle(dailyPuzzle(today, count));
    } else {
      setPuzzle(practicePuzzle(today, count));
    }
    setSession((n) => n + 1);
    setPhase("playing");
  }

  const storedDaily = getDailyResult(today);

  return (
    <div className="app">
      {phase === "start" && (
        <StartScreen
          date={today}
          dailyDone={Boolean(storedDaily)}
          debugRows={debugRows}
          onStart={start}
          onViewResults={() => {
            const existing = getDailyResult(today);
            if (existing) {
              setResult(existing);
              setPhase("results");
            }
          }}
        />
      )}
      {phase === "playing" && puzzle && (
        <GameScreen
          key={session}
          puzzle={puzzle}
          onRunComplete={persist}
          bests={bests}
          completedDays={completedDays}
          today={today}
          onHome={() => setPhase("start")}
          onPractice={() => start("practice")}
        />
      )}
      {phase === "results" && result && (
        <ResultsScreen
          result={result}
          bests={bests}
          completedDays={completedDays}
          today={today}
          onHome={() => setPhase("start")}
          onPractice={() => start("practice")}
        />
      )}
    </div>
  );
}
