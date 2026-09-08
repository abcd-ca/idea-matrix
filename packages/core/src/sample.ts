import type { Clock } from "./document";
import { emptyDocument } from "./document";
import type { Idea, MatrixDocument } from "./schema";

/**
 * Nine fictional ideas for the "start with an example" door and for tests.
 * Nothing here is a real idea of the author's.
 */
export function sampleDocument(clock: Clock = () => new Date()): MatrixDocument {
  const now = clock().toISOString();
  const day = (offset: number) => new Date(clock().getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  const mk = (
    id: string,
    name: string,
    fields: Partial<Omit<Idea, "id" | "name" | "createdAt" | "updatedAt">> & { scores: Idea["scores"] },
  ): Idea => ({
    id,
    name,
    description: "",
    stage: "Backlog",
    riskiestAssumption: "",
    confidence: 1,
    parkedReason: "",
    evidence: [],
    createdAt: now,
    updatedAt: now,
    ...fields,
  });

  const ideas: Idea[] = [
    mk("sample-sauna", "Pop-up sauna bookings", {
      description:
        "A trailer sauna that parks at the lake on winter weekends. People book a 45-minute slot from their phone instead of turning up and hoping.",
      stage: "Validated",
      riskiestAssumption:
        "People already drive to the lake for cold dips on winter weekends and complain there is nowhere to warm up.",
      scores: { reach: 3, impact: 3, profitability: 4, vision: 4, ease: 3 },
      confidence: 4,
      evidence: [
        {
          id: "sample-sauna-e1",
          date: day(40),
          who: "Cold-dip group organizer",
          whatTheyDoNow: "Runs a weekly dip for about 30 people; they warm up in their cars afterwards.",
          commitment: "Will post the booking link to the group's chat on the first weekend.",
        },
        {
          id: "sample-sauna-e2",
          date: day(33),
          who: "Two regulars at the lake",
          whatTheyDoNow: "Drove 40 minutes to a sauna in the next town last month and paid $25 each.",
          commitment: "",
        },
        {
          id: "sample-sauna-e3",
          date: day(20),
          who: "Campground manager",
          whatTheyDoNow: "Gets asked about warm-up options most winter weekends; has no answer.",
          commitment: "Offered a parking spot by the beach for the first month at no charge.",
        },
      ],
    }),
    mk("sample-tools", "Community tool library app", {
      description:
        "Neighbours lend drills, ladders and pressure washers to each other through a shared list, instead of everyone owning one of everything.",
      stage: "Talking to customers",
      riskiestAssumption:
        "People on my street already lend tools to each other at least a few times a year, and have lost track of who has what.",
      scores: { reach: 2, impact: 4, profitability: 1, vision: 4, ease: 4 },
      confidence: 3,
      evidence: [
        {
          id: "sample-tools-e1",
          date: day(12),
          who: "Neighbour, three doors down",
          whatTheyDoNow: "Lends his pressure washer to two families; keeps track in his head and lost a ladder for a month.",
          commitment: "",
        },
        {
          id: "sample-tools-e2",
          date: day(9),
          who: "Strata council chair",
          whatTheyDoNow: "Tried a shared-shed spreadsheet in 2024; nobody updated it after the first week.",
          commitment: "Will introduce me to two other strata councils.",
        },
      ],
    }),
    mk("sample-weather", "Trailhead weather board", {
      description:
        "A small solar-powered e-ink sign at popular trailheads showing today's summit forecast, avalanche rating and trail closures.",
      stage: "Exploring",
      riskiestAssumption:
        "Hikers at the local trailheads do not check the summit forecast before leaving the car park, and the trail association fields complaints because of it.",
      scores: { reach: 3, impact: 4, profitability: 2, vision: 5, ease: 3 },
      confidence: 2,
      evidence: [
        {
          id: "sample-weather-e1",
          date: day(5),
          who: "Someone at a meetup",
          whatTheyDoNow: "",
          commitment: "",
        },
      ],
    }),
    mk("sample-rink", "Backyard rink monitor", {
      description:
        "A sensor that tells you when the ice is thick enough to skate and when to flood again, so you stop guessing at 6 a.m.",
      riskiestAssumption:
        "People with backyard rinks currently go outside several times a night to check the ice by hand.",
      scores: { reach: 2, impact: 4, profitability: 2, vision: 5, ease: 4 },
    }),
    mk("sample-sourdough", "Sourdough starter tracker", {
      description: "Log feedings, rise times and oven results, and get a nudge when the starter is ready.",
      scores: { reach: 4, impact: 2, profitability: 2, vision: 3, ease: 5 },
    }),
    mk("sample-ski", "Ski tuning kiosk", {
      description:
        "Drop your skis at a locker outside the grocery store in the evening, pick them up waxed and edged in the morning.",
      scores: { reach: 3, impact: 4, profitability: 4, vision: 3, ease: 2 },
    }),
    mk("sample-podcast", "Podcast show-notes bot", {
      description: "Paste an episode link, get timestamps, links and a summary you can actually publish.",
      scores: { reach: 4, impact: 3, profitability: 3, vision: 2, ease: 4 },
    }),
    mk("sample-snow", "Neighbourhood snow-clearing roster", {
      description: "A shared roster so the same two people are not always the ones clearing the shared lane.",
      scores: { reach: 2, impact: 3, profitability: null, vision: 3, ease: 4 },
    }),
    mk("sample-dogwalk", "Dog walker matching", {
      description: "Match dog owners on the same street so walks get shared.",
      stage: "Parked",
      parkedReason: "Three existing apps do this already and the two owners I asked were happy with them.",
      scores: { reach: 4, impact: 3, profitability: 3, vision: 2, ease: 2 },
      confidence: 2,
    }),
  ];

  return { ...emptyDocument("Example ideas", clock), ideas };
}
