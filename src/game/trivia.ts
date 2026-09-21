import { hashString, mulberry32 } from "./rng.ts";
import type { Mode } from "../types.ts";

export interface TriviaBand {
  /** Inclusive lower bound, percent 0–100. */
  min: number;
  /** Inclusive upper bound, percent 0–100. */
  max: number;
  /** Noun phrases including the article, e.g. "a surgeon". */
  pool: string[];
}

export interface TriviaLine {
  prefix: string;
  target: string;
  text: string;
  band: TriviaBand;
}

/**
 * Accuracy bands, high → low. First matching range wins.
 * Percents are 0–100; 100 is exact perfect only.
 */
export const TRIVIA_BANDS: TriviaBand[] = [
  {
    min: 100,
    max: 100,
    pool: [
      "a surgeon",
      "a watchmaker",
      "a metronome",
      "a diamond cutter",
      "an atomic clock",
      "a Japanese tea master",
      "a concert tuner",
      "a calligrapher",
      "a Swiss movement",
      "a laminar flame",
    ],
  },
  {
    min: 95,
    max: 99.999,
    pool: [
      "a jeweler",
      "a concert pianist",
      "a laser level",
      "an origami master",
      "a violin maker",
      "a sushi chef",
      "a proofreader",
      "a satellite dish",
      "a fountain-pen nib",
      "a tightrope walker",
    ],
  },
  {
    min: 90,
    max: 94.999,
    pool: [
      "an elite sniper",
      "a fighter pilot",
      "a Swiss train",
      "a lab pipette",
      "a falcon",
      "a typesetter",
      "a millwright",
      "a rugby place-kicker",
      "a surveyor's stake",
      "a hummingbird",
    ],
  },
  {
    min: 80,
    max: 89.999,
    pool: [
      "a librarian",
      "a GPS satellite",
      "a chess clock",
      "a seamstress",
      "a honeybee",
      "a spirit level",
      "an archivist",
      "a barista's pour",
      "a mason's plumb line",
      "a crossword editor",
    ],
  },
  {
    min: 70,
    max: 79.999,
    pool: [
      "a dart champion",
      "a well-tuned piano",
      "a seasoned bartender",
      "a postal scale",
      "a heron",
      "a locksmith",
      "a compass",
      "a crossword regular",
      "a sewing machine",
      "a lighthouse",
    ],
  },
  {
    min: 60,
    max: 69.999,
    pool: [
      "a weather forecast",
      "a weekend carpenter",
      "a street musician",
      "a kitchen scale",
      "a house cat",
      "a paperback map",
      "a parking meter",
      "a lucky coin",
      "a well-used cookbook",
      "a bicycle dynamo",
    ],
  },
  {
    min: 45,
    max: 59.999,
    pool: [
      "a treasure map",
      "a rusty compass",
      "a magic 8-ball",
      "a shuffled playlist",
      "a thrift-store camera",
      "a weather vane",
      "a Sunday driver",
      "a coin toss",
      "a secondhand metronome",
      "a flea-market telescope",
    ],
  },
  {
    min: 30,
    max: 44.999,
    pool: [
      "a foggy windshield",
      "a blindfolded painter",
      "a bargain binocular",
      "a startled octopus",
      "a leaking fountain pen",
      "a carnival game",
      "a loose hinge",
      "a half-wound watch",
      "a smudged blueprint",
      "a windblown weathervane",
    ],
  },
  {
    min: 15,
    max: 29.999,
    pool: [
      "a broken printer",
      "a supermarket scanner",
      "a startled pigeon",
      "a jammed zipper",
      "a skipping record",
      "a dropped knitting needle",
      "a sneeze",
      "a supermarket trolley",
      "a flickering bulb",
      "a loose typewriter key",
    ],
  },
  {
    min: 0,
    max: 14.999,
    pool: [
      "a clumsy panda",
      "a spilled inkwell",
      "a tornado",
      "a wet bar of soap",
      "a startled moose",
      "a piñata",
      "a dropped tray",
      "a lava lamp",
      "a toddler with crayons",
      "a unicycle in a windstorm",
    ],
  },
];

export function bandForAccuracy(accuracy: number): TriviaBand {
  const pct = Math.max(0, Math.min(100, accuracy * 100));
  if (accuracy >= 1 || pct >= 100) return TRIVIA_BANDS[0]!;
  for (const band of TRIVIA_BANDS) {
    if (pct >= band.min) return band;
  }
  return TRIVIA_BANDS[TRIVIA_BANDS.length - 1]!;
}

export function pickTrivia(opts: {
  accuracy: number;
  date: string;
  mode: Mode;
  seed?: number;
}): TriviaLine {
  const band = bandForAccuracy(opts.accuracy);
  // Daily: same UTC day string as getTodayUtc() / puzzle.date. Practice: run seed.
  const key =
    opts.mode === "daily"
      ? `focustest:trivia:${opts.date}:${band.min}`
      : `focustest:trivia:practice:${opts.seed ?? 0}:${band.min}`;
  const rand = mulberry32(hashString(key));
  const target = band.pool[Math.floor(rand() * band.pool.length)]!;
  const prefix = "Today you're as precise as";
  return { prefix, target, text: `${prefix} ${target}`, band };
}
