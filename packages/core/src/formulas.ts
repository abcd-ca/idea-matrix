import { CRITERIA, type EvidenceEntry, type Scores } from "./schema";

/**
 * Potential is the plain average of the five scores scaled to 0..100.
 * It is null until all five are filled in. There are no user weights.
 */
export function potential(scores: Scores): number | null {
  let sum = 0;
  for (const key of CRITERIA) {
    const value = scores[key];
    if (value === null || value === undefined) return null;
    sum += value;
  }
  return Math.round((sum / CRITERIA.length) * 20);
}

/** Score = Potential × Confidence ÷ 5. Null when Potential is null. */
export function score(potentialValue: number | null, confidence: number): number | null {
  if (potentialValue === null) return null;
  return Math.round((potentialValue * confidence) / 5);
}

export type Band = "grey" | "amber" | "lightGreen" | "darkGreen";

export const BANDS: Record<Band, { min: number; max: number; label: string; advice: string }> = {
  grey: { min: 0, max: 39, label: "not yet", advice: "not worth time yet" },
  amber: { min: 40, max: 59, label: "worth a look", advice: "worth a look" },
  lightGreen: {
    min: 60,
    max: 79,
    label: "talk to customers",
    advice: "worth a customer conversation",
  },
  darkGreen: {
    min: 80,
    max: 100,
    label: "serious plan",
    advice: "worth a serious plan",
  },
};

export function band(value: number | null): Band | null {
  if (value === null) return null;
  if (value >= 80) return "darkGreen";
  if (value >= 60) return "lightGreen";
  if (value >= 40) return "amber";
  return "grey";
}

/**
 * The Mom Test gate. Confidence above 2 needs at least one evidence entry
 * that records what the person currently does about the problem; 5 needs a
 * recorded commitment. This is a plain rule, no model involved.
 */
export function maxConfidenceAllowed(evidence: EvidenceEntry[]): 2 | 4 | 5 {
  const hasBehaviour = evidence.some((e) => e.whatTheyDoNow.trim() !== "");
  if (!hasBehaviour) return 2;
  const hasCommitment = evidence.some((e) => e.commitment.trim() !== "");
  return hasCommitment ? 5 : 4;
}

export function confidenceGateMessage(allowed: 2 | 4 | 5): string {
  switch (allowed) {
    case 2:
      return "Confidence above 2 needs an evidence entry that records what someone currently does about the problem.";
    case 4:
      return "Confidence 5 needs an evidence entry with a commitment: money, an introduction, or a pilot.";
    case 5:
      return "";
  }
}
