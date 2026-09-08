import type { Criterion, Stage } from "./schema";

/** Human meaning of every score, shown beside the control as the user picks. */
export const CRITERION_INFO: Record<
  Criterion,
  { label: string; short: string; question: string; levels: Record<number, string> }
> = {
  reach: {
    label: "Reach",
    short: "Reach",
    question: "How many people could this serve?",
    levels: {
      1: "me and a few friends",
      2: "one club or company",
      3: "a regional niche",
      4: "a national or global niche",
      5: "mass market",
    },
  },
  impact: {
    label: "Impact",
    short: "Impact",
    question: "How much difference does it make to one user?",
    levels: {
      1: "barely noticed",
      2: "a small convenience",
      3: "a real improvement",
      4: "a real difference to one user",
      5: "changes something important for them",
    },
  },
  profitability: {
    label: "Profitability",
    short: "Profit",
    question: "Revenue minus cost, once it is running?",
    levels: {
      0: "deliberately non-commercial",
      1: "revenue barely covers cost",
      2: "a little left over",
      3: "a modest, steady margin",
      4: "clearly profitable",
      5: "very profitable",
    },
  },
  vision: {
    label: "Vision",
    short: "Vision",
    question: "How well does it fit the working life you want?",
    levels: {
      1: "not how I want to spend my time",
      2: "tolerable",
      3: "fits some of what I want",
      4: "fits how I want to work",
      5: "exactly the work I want to be doing",
    },
  },
  ease: {
    label: "Ease",
    short: "Ease",
    question: "How easy is it to launch and keep running, with today's tools?",
    levels: {
      1: "months of hard work",
      2: "a couple of months",
      3: "a few weeks",
      4: "a couple of weekends",
      5: "a weekend",
    },
  },
};

export const CONFIDENCE_INFO = {
  label: "Confidence",
  question: "How much evidence is behind those scores?",
  levels: {
    1: "gut feel",
    2: "desk research, or someone raised the problem unprompted",
    3: "a few real conversations with people who have the problem",
    4: "several conversations that all point the same way",
    5: "a commitment: money, an introduction, or a pilot",
  } as Record<number, string>,
  rules: [
    "Talk about their life, not your idea.",
    "Ask what they did, not what they would do.",
    "Only a commitment counts as proof.",
  ],
};

/**
 * The Confidence gate in one breath. Every screen that explains the gate
 * shows this same sentence so they cannot drift apart.
 */
export const CONFIDENCE_GATE_SUMMARY =
  "Confidence above 2 needs an evidence entry that records what someone currently does about the problem. Confidence 5 needs a commitment: money, an introduction, or a pilot.";

export const STAGE_INFO: Record<Stage, string> = {
  Backlog: "Written down, not yet looked at.",
  Exploring: "Thinking it through and doing desk research.",
  "Talking to customers": "Having real conversations about the problem.",
  Validated: "Conversations confirmed the problem and someone committed.",
  Building: "Actually making it.",
  Parked: "Set aside, with the reason recorded. Never deleted.",
};

export const FORMULA_INFO = {
  potential:
    "Potential is the average of the five scores, scaled 0 to 100. It is blank until all five are filled in.",
  score:
    "Score is Potential × Confidence ÷ 5. It only rises with evidence, so a great-sounding idea cannot outrank one you have actually tested.",
};
