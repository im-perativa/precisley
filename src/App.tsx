import { useCallback, useEffect, useMemo, useState } from "react";
import { StartScreen } from "./components/StartScreen.tsx";
import { GameScreen } from "./components/GameScreen.tsx";
import { ResultsScreen } from "./components/ResultsScreen.tsx";
import { dailyPuzzle, debugRowCount, practicePuzzle, rowCount } from "./game/puzzle.ts";
import { getTodayUtc, syncTodayUtc } from "./game/utcDate.ts";
import { getDailyResult, loadState, recordRun } from "./game/storage.ts";
import type { Mode, PersonalBests, Phase, Puzzle, RunResult } from "./types.ts";

function bestsFor(mode: Mode, daily: PersonalBests, practice: PersonalBests): PersonalBests {
  return mode === "daily" ? daily : practice;
}

export default function App() {
  const [today, setToday] = useState(() => getTodayUtc());
  const [clockReady, setClockReady] = useState(false);
  const debugRows = useMemo(() => debugRowCount(), []);
  const initial = useMemo(() => loadState(), []);

  const [phase, setPhase] = useState<Phase>("start");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [bests, setBests] = useState(initial.bests);
  const [practiceBests, setPracticeBests] = useState(initial.practiceBests);
  const [completedDays, setCompletedDays] = useState(initial.completedDays);
  const [session, setSession] = useState(0);
  const [skipToBonus, setSkipToBonus] = useState(false);
  const [persistRuns, setPersistRuns] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void syncTodayUtc().then((day) => {
      if (cancelled) return;
      setToday(day);
      setResult(getDailyResult(day));
      setClockReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "start") return;
    setResult(getDailyResult(today));
  }, [today, phase]);

  const persist = useCallback(
    (run: RunResult) => {
      const state = recordRun(run, { persistDaily: persistRuns });
      setBests(state.bests);
      setPracticeBests(state.practiceBests);
      setCompletedDays(state.completedDays);
      if (persistRuns) setResult(run);
    },
    [persistRuns],
  );

  function start(mode: Mode) {
    setSkipToBonus(false);
    setPersistRuns(true);
    if (mode === "daily") {
      if (!clockReady) return;
      const existing = getDailyResult(today);
      if (existing) {
        setResult(existing);
        setPhase("results");
        return;
      }
      setPuzzle(dailyPuzzle(today, rowCount("daily")));
    } else {
      setPuzzle(practicePuzzle(today, rowCount("practice")));
    }
    setSession((n) => n + 1);
    setPhase("playing");
  }

  function startEndlessDev() {
    if (!import.meta.env.DEV || !clockReady) return;
    const existing = getDailyResult(today);
    setPuzzle(dailyPuzzle(today, rowCount("daily")));
    setSkipToBonus(true);
    setPersistRuns(!existing);
    setSession((n) => n + 1);
    setPhase("playing");
  }

  const storedDaily = clockReady ? getDailyResult(today) : null;

  return (
    <div className="app">
      {phase === "start" && (
        <StartScreen
          date={today}
          clockReady={clockReady}
          dailyDone={Boolean(storedDaily)}
          debugRows={debugRows}
          onStart={start}
          onStartEndlessDev={startEndlessDev}
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
          skipToBonus={skipToBonus}
          onRunComplete={persist}
          bests={bestsFor(puzzle.mode, bests, practiceBests)}
          completedDays={completedDays}
          today={today}
          onHome={() => setPhase("start")}
          onPractice={() => start("practice")}
        />
      )}
      {phase === "results" && result && (
        <ResultsScreen
          result={result}
          bests={bestsFor(result.mode, bests, practiceBests)}
          completedDays={completedDays}
          today={today}
          onHome={() => setPhase("start")}
          onPractice={() => start("practice")}
        />
      )}
    </div>
  );
}
