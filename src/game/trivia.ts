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
      "a fortune cookie",
      "a mood ring",
      "a horoscope",
      "a spare-room dartboard",
      "a tourist in a maze",
      "a radio with static",
      "a guess at the time",
      "a crumpled receipt",
      "a half-remembered shortcut",
      "a lottery pencil",
      "a foggy pair of glasses",
      "a dog chasing its tail",
      "a rusty bike bell",
      "a maybe-this-way shrug",
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
      "a drunk dart",
      "a blurry photocopy",
      "a cat in a paper bag",
      "a compass next to a magnet",
      "a skipped stitch",
      "a flashlight with dying batteries",
      "a map held upside down",
      "a sneeze mid-sentence",
      "a wobbly stool",
      "a camera with the lens cap on",
      "a moth at a porch light",
      "a loose screw",
      "a crossword in the dark",
      "a rubber-band ball",
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
      "a hungover GPS",
      "a sock in a dryer",
      "a startled squirrel",
      "a coffee stain",
      "a autocorrect",
      "a shopping cart with a bad wheel",
      "a popped balloon",
      "a dropped call",
      "a tangled headphone cord",
      "a sneeze into a spreadsheet",
      "a cat on a keyboard",
      "a skipped heartbeat",
      "a jammed photocopier",
      "a fortune that missed",
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
