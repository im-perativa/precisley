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
 *
 * `min` is a percent threshold matched with integer math:
 *   correct * 100 >= min * total
 * so every k/60 daily (and k/20 practice) score lands in exactly one band.
 * Daily 60-row correct counts are noted on each band.
 */
export const TRIVIA_BANDS: TriviaBand[] = [
  {
    min: 100,
    max: 100,
    // daily: 60/60
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
      "a neurosurgeon",
      "a master engraver",
      "a pendulum at rest",
      "a kiln at temperature",
      "a glassblower",
      "a chess grandmaster",
      "a NASA guidance computer",
      "a conservator",
      "a master printer",
      "a sequin on a straight pin",
      "a monk copying scripture",
      "a lathe that never chatters",
      "a jeweler's loupe",
      "a silent clock",
    ],
  },
  {
    min: 95,
    max: 99,
    // daily: 57–59/60
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
      "a data engineer",
      "a statistician",
      "an air-traffic controller",
      "a pastry chef",
      "a bookbinder",
      "a lab technician",
      "a cartographer",
      "a ballet dancer",
      "a taxidermist",
      "a CNC mill",
      "a film editor",
      "a pharmacist",
      "a sommelier",
      "a telescope mount",
      "a pool shark",
      "a transcriptionist",
    ],
  },
  {
    min: 90,
    max: 94,
    // daily: 54–56/60
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
      "an archer",
      "a bomb-disposal tech",
      "a Formula 1 pit crew",
      "a court stenographer",
      "a mountain goat",
      "a safecracker",
      "a tailor's chalk",
      "a crane operator",
      "a spider on silk",
      "a drill sergeant's stopwatch",
      "a marksman's rest",
      "a cat on a fence",
      "an Olympic diver",
      "a radio astronomer",
    ],
  },
  {
    min: 80,
    max: 89,
    // daily: 48–53/60
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
      "a nurse on night shift",
      "a railroad switch",
      "an owl at dusk",
      "a copy editor",
      "a chess clock's flag",
      "a baker's scale",
      "a stage manager",
      "a traffic cop",
      "a crossword pen",
      "a crow with a tool",
      "a metronome on mute",
      "a well-kept ledger",
      "a park ranger",
      "a sewing gauge",
    ],
  },
  {
    min: 70,
    max: 79,
    // daily: 42–47/60
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
      "a decent chef",
      "a bus driver on time",
      "a fox in a garden",
      "a well-oiled hinge",
      "a bowler on a league night",
      "a schoolteacher's ruler",
      "a thrifted spirit level",
      "a raven",
      "a backyard telescope",
      "a practiced juggler",
      "a kitchen timer",
      "a mailman who knows the street",
      "a sturdy tripod",
      "a regular at the dartboard",
    ],
  },
  {
    min: 60,
    max: 69,
    // daily: 36–41/60
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
      "a casual golfer",
      "a slightly bent ruler",
      "a raccoon with a plan",
      "a hand-me-down watch",
      "a GPS that recalculates",
      "an amateur magician",
      "an office printer on a good day",
      "a pigeon with a route",
      "a yardstick with a nick",
      "a hobbyist astronomer",
      "a microwave's popcorn button",
      "a tourist with a guidebook",
      "a dog that almost sits",
      "a homemade sundial",
    ],
  },
  {
    min: 50,
    max: 59,
    // daily: 30–35/60
    pool: [
      "a weather forecast on a clear day",
      "a kitchen scale",
      "a paperback map",
      "a lucky coin",
      "a well-used cookbook",
      "a casual golfer",
      "a slightly bent ruler",
      "a hand-me-down watch",
      "a GPS that recalculates",
      "a pigeon with a route",
      "a yardstick with a nick",
      "a hobbyist astronomer",
      "a tourist with a guidebook",
      "a homemade sundial",
      "a spare-room dartboard",
      "a secondhand metronome",
      "a flea-market telescope",
      "a thrift-store camera",
    ],
  },
  {
    min: 40,
    max: 49,
    // daily: 24–29/60
    pool: [
      "a treasure map",
      "a rusty compass",
      "a magic 8-ball",
      "a shuffled playlist",
      "a weather vane",
      "a Sunday driver",
      "a coin toss",
      "a fortune cookie",
      "a mood ring",
      "a horoscope",
      "a tourist in a maze",
      "a radio with static",
      "a guess at the time",
      "a crumpled receipt",
      "a half-remembered shortcut",
      "a lottery pencil",
      "a rusty bike bell",
      "a maybe-this-way shrug",
    ],
  },
  {
    min: 30,
    max: 39,
    // daily: 18–23/60
    pool: [
      "a foggy windshield",
      "a bargain binocular",
      "a leaking fountain pen",
      "a carnival game",
      "a loose hinge",
      "a half-wound watch",
      "a smudged blueprint",
      "a windblown weathervane",
      "a blurry photocopy",
      "a skipped stitch",
      "a flashlight with dying batteries",
      "a map held upside down",
      "a wobbly stool",
      "a foggy pair of glasses",
      "a dog chasing its tail",
      "a compass next to a magnet",
    ],
  },
  {
    min: 20,
    max: 29,
    // daily: 12–17/60
    pool: [
      "a blindfolded painter",
      "a startled octopus",
      "a drunk dart",
      "a cat in a paper bag",
      "a sneeze mid-sentence",
      "a camera with the lens cap on",
      "a moth at a porch light",
      "a loose screw",
      "a crossword in the dark",
      "a rubber-band ball",
      "a hungover GPS",
      "a supermarket scanner",
      "a jammed zipper",
      "a skipping record",
      "a flickering bulb",
      "a shopping cart with a bad wheel",
    ],
  },
  {
    min: 10,
    max: 19,
    // daily: 6–11/60
    pool: [
      "a broken printer",
      "a startled pigeon",
      "a dropped knitting needle",
      "a sneeze",
      "a supermarket trolley",
      "a loose typewriter key",
      "a sock in a dryer",
      "a startled squirrel",
      "a coffee stain",
      "an autocorrect",
      "a popped balloon",
      "a dropped call",
      "a tangled headphone cord",
      "a cat on a keyboard",
      "a jammed photocopier",
      "a fortune that missed",
    ],
  },
  {
    min: 0,
    max: 9,
    // daily: 0–5/60
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
      "a bull in a china shop",
      "a slapstick reel",
      "a dropped wedding cake",
      "a roomba in a party",
      "a startled chicken",
      "a juggler who forgot the balls",
      "a fireworks mishap",
      "a penguin on ice skates",
      "a spilled toolbox",
      "a cat vs. a curtain",
      "a whoopee cushion",
      "a banana peel",
      "a sneeze in a library stacks",
      "a golden retriever in a paint store",
    ],
  },
];

/** Integer compare so 57/60 is 95% (not 94.999). */
export function bandForScore(correct: number, total: number): TriviaBand {
  if (total <= 0) return TRIVIA_BANDS[TRIVIA_BANDS.length - 1]!;
  const c = Math.max(0, Math.min(total, Math.round(correct)));
  for (const band of TRIVIA_BANDS) {
    if (c * 100 >= band.min * total) return band;
  }
  return TRIVIA_BANDS[TRIVIA_BANDS.length - 1]!;
}

export function bandForAccuracy(accuracy: number, total = 60): TriviaBand {
  const c = Math.round(Math.max(0, Math.min(1, accuracy)) * total);
  return bandForScore(c, total);
}

export function pickTrivia(opts: {
  accuracy: number;
  date: string;
  mode: Mode;
  seed?: number;
  correct?: number;
  total?: number;
}): TriviaLine {
  const total = opts.total && opts.total > 0 ? opts.total : 60;
  const correct =
    opts.correct != null ? opts.correct : Math.round(Math.max(0, Math.min(1, opts.accuracy)) * total);
  const band = bandForScore(correct, total);
  const key =
    opts.mode === "daily"
      ? `focustest:trivia:${opts.date}:${band.min}`
      : `focustest:trivia:practice:${opts.seed ?? 0}:${band.min}`;
  const rand = mulberry32(hashString(key));
  const target = band.pool[Math.floor(rand() * band.pool.length)]!;
  const prefix = "Today you're as precise as";
  return { prefix, target, text: `${prefix} ${target}`, band };
}
