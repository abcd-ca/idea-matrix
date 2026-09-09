import type { Clock } from "./document";
import { emptyDocument } from "./document";
import type { Idea, MatrixDocument, Stage } from "./schema";

/**
 * Nine fictional ideas for the "start with an example" door and for tests.
 * Nothing here is a real idea of the author's.
 *
 * The words live in SAMPLE_TEXT, the numbers, stages and dates in SHAPE, so
 * the web app can hand `sampleDocument` a translation of the words and get
 * the same nine ideas in the reader's language. Core keeps the English, the
 * same as for the scales and stages; the MCP server and CLI use it as is.
 */
export const SAMPLE_IDEA_KEYS = [
  "sauna",
  "tools",
  "weather",
  "rink",
  "sourdough",
  "ski",
  "podcast",
  "snow",
  "dogwalk",
] as const;
export type SampleIdeaKey = (typeof SAMPLE_IDEA_KEYS)[number];

export interface SampleEvidenceText {
  who: string;
  whatTheyDoNow: string;
  commitment: string;
}

export interface SampleIdeaText {
  name: string;
  description: string;
  riskiestAssumption?: string;
  parkedReason?: string;
  /** Keyed "e1", "e2", ... in the order the entries were recorded. */
  evidence?: Record<string, SampleEvidenceText>;
}

export interface SampleText {
  /** The document's name. */
  name: string;
  ideas: Record<SampleIdeaKey, SampleIdeaText>;
}

export const SAMPLE_TEXT: SampleText = {
  name: "Example ideas",
  ideas: {
    sauna: {
      name: "Pop-up sauna bookings",
      description:
        "A trailer sauna that parks at the lake on winter weekends. People book a 45-minute slot from their phone instead of turning up and hoping.",
      riskiestAssumption:
        "People already drive to the lake for cold dips on winter weekends and complain there is nowhere to warm up.",
      evidence: {
        e1: {
          who: "Cold-dip group organizer",
          whatTheyDoNow: "Runs a weekly dip for about 30 people; they warm up in their cars afterwards.",
          commitment: "Will post the booking link to the group's chat on the first weekend.",
        },
        e2: {
          who: "Two regulars at the lake",
          whatTheyDoNow: "Drove 40 minutes to a sauna in the next town last month and paid $25 each.",
          commitment: "",
        },
        e3: {
          who: "Campground manager",
          whatTheyDoNow: "Gets asked about warm-up options most winter weekends; has no answer.",
          commitment: "Offered a parking spot by the beach for the first month at no charge.",
        },
      },
    },
    tools: {
      name: "Community tool library app",
      description:
        "Neighbours lend drills, ladders and pressure washers to each other through a shared list, instead of everyone owning one of everything.",
      riskiestAssumption:
        "People on my street already lend tools to each other at least a few times a year, and have lost track of who has what.",
      evidence: {
        e1: {
          who: "Neighbour, three doors down",
          whatTheyDoNow:
            "Lends his pressure washer to two families; keeps track in his head and lost a ladder for a month.",
          commitment: "",
        },
        e2: {
          who: "Strata council chair",
          whatTheyDoNow: "Tried a shared-shed spreadsheet in 2024; nobody updated it after the first week.",
          commitment: "Will introduce me to two other strata councils.",
        },
      },
    },
    weather: {
      name: "Trailhead weather board",
      description:
        "A small solar-powered e-ink sign at popular trailheads showing today's summit forecast, avalanche rating and trail closures.",
      riskiestAssumption:
        "Hikers at the local trailheads do not check the summit forecast before leaving the car park, and the trail association fields complaints because of it.",
      evidence: {
        e1: { who: "Someone at a meetup", whatTheyDoNow: "", commitment: "" },
      },
    },
    rink: {
      name: "Backyard rink monitor",
      description:
        "A sensor that tells you when the ice is thick enough to skate and when to flood again, so you stop guessing at 6 a.m.",
      riskiestAssumption:
        "People with backyard rinks currently go outside several times a night to check the ice by hand.",
    },
    sourdough: {
      name: "Sourdough starter tracker",
      description: "Log feedings, rise times and oven results, and get a nudge when the starter is ready.",
    },
    ski: {
      name: "Ski tuning kiosk",
      description:
        "Drop your skis at a locker outside the grocery store in the evening, pick them up waxed and edged in the morning.",
    },
    podcast: {
      name: "Podcast show-notes bot",
      description: "Paste an episode link, get timestamps, links and a summary you can actually publish.",
    },
    snow: {
      name: "Neighbourhood snow-clearing roster",
      description: "A shared roster so the same two people are not always the ones clearing the shared lane.",
    },
    dogwalk: {
      name: "Dog walker matching",
      description: "Match dog owners on the same street so walks get shared.",
      parkedReason: "Three existing apps do this already and the two owners I asked were happy with them.",
    },
  },
};

interface SampleShape {
  stage?: Stage;
  scores: Idea["scores"];
  confidence?: number;
  /** One entry per evidence key in SAMPLE_TEXT, with the entry's age in days. */
  evidence?: Record<string, number>;
}

const SHAPE: Record<SampleIdeaKey, SampleShape> = {
  sauna: {
    stage: "Validated",
    scores: { reach: 3, impact: 3, profitability: 4, vision: 4, ease: 3 },
    confidence: 4,
    evidence: { e1: 40, e2: 33, e3: 20 },
  },
  tools: {
    stage: "Talking to customers",
    scores: { reach: 2, impact: 4, profitability: 1, vision: 4, ease: 4 },
    confidence: 3,
    evidence: { e1: 12, e2: 9 },
  },
  weather: {
    stage: "Exploring",
    scores: { reach: 3, impact: 4, profitability: 2, vision: 5, ease: 3 },
    confidence: 2,
    evidence: { e1: 5 },
  },
  rink: { scores: { reach: 2, impact: 4, profitability: 2, vision: 5, ease: 4 } },
  sourdough: { scores: { reach: 4, impact: 2, profitability: 2, vision: 3, ease: 5 } },
  ski: { scores: { reach: 3, impact: 4, profitability: 4, vision: 3, ease: 2 } },
  podcast: { scores: { reach: 4, impact: 3, profitability: 3, vision: 2, ease: 4 } },
  snow: { scores: { reach: 2, impact: 3, profitability: null, vision: 3, ease: 4 } },
  dogwalk: {
    stage: "Parked",
    scores: { reach: 4, impact: 3, profitability: 3, vision: 2, ease: 2 },
    confidence: 2,
  },
};

/**
 * The example document. Pass a translation of SAMPLE_TEXT to get the same
 * ideas, ids, scores and dates with the words in another language.
 */
export function sampleDocument(clock: Clock = () => new Date(), text: SampleText = SAMPLE_TEXT): MatrixDocument {
  const now = clock().toISOString();
  const day = (offset: number) => new Date(clock().getTime() - offset * 86_400_000).toISOString().slice(0, 10);

  const ideas: Idea[] = SAMPLE_IDEA_KEYS.map((key) => {
    const shape = SHAPE[key];
    const words = text.ideas[key];
    const evidence = Object.entries(shape.evidence ?? {}).map(([entryKey, daysAgo]) => ({
      id: `sample-${key}-${entryKey}`,
      date: day(daysAgo),
      ...(words.evidence?.[entryKey] ?? { who: "", whatTheyDoNow: "", commitment: "" }),
    }));
    return {
      id: `sample-${key}`,
      name: words.name,
      description: words.description,
      stage: shape.stage ?? "Backlog",
      riskiestAssumption: words.riskiestAssumption ?? "",
      scores: shape.scores,
      confidence: shape.confidence ?? 1,
      parkedReason: words.parkedReason ?? "",
      evidence,
      createdAt: now,
      updatedAt: now,
    };
  });

  return { ...emptyDocument(text.name, clock), ideas };
}
