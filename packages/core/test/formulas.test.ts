import { describe, expect, it } from "vitest";
import { band, maxConfidenceAllowed, potential, score } from "../src/formulas";

describe("potential", () => {
  it("is the average of the five scores scaled to 100", () => {
    expect(potential({ reach: 3, impact: 4, profitability: 2, vision: 5, ease: 3 })).toBe(68);
    expect(potential({ reach: 5, impact: 5, profitability: 5, vision: 5, ease: 5 })).toBe(100);
    expect(potential({ reach: 1, impact: 1, profitability: 1, vision: 1, ease: 1 })).toBe(20);
  });
  it("allows 0 for profitability", () => {
    expect(potential({ reach: 3, impact: 5, profitability: 0, vision: 5, ease: 4 })).toBe(68);
  });
  it("is null until all five are filled", () => {
    expect(potential({ reach: 3, impact: 4, profitability: null, vision: 5, ease: 3 })).toBeNull();
  });
});

describe("score", () => {
  it("is potential × confidence ÷ 5, rounded", () => {
    expect(score(68, 1)).toBe(14);
    expect(score(68, 3)).toBe(41);
    expect(score(68, 5)).toBe(68);
    expect(score(88, 1)).toBe(18);
  });
  it("is null when potential is null", () => {
    expect(score(null, 5)).toBeNull();
  });
});

describe("band", () => {
  it("uses the four colour bands", () => {
    expect(band(0)).toBe("grey");
    expect(band(39)).toBe("grey");
    expect(band(40)).toBe("amber");
    expect(band(59)).toBe("amber");
    expect(band(60)).toBe("lightGreen");
    expect(band(79)).toBe("lightGreen");
    expect(band(80)).toBe("darkGreen");
    expect(band(100)).toBe("darkGreen");
    expect(band(null)).toBeNull();
  });
});

describe("maxConfidenceAllowed (the Mom Test gate)", () => {
  const entry = (whatTheyDoNow: string, commitment: string) => ({
    id: "e",
    date: "2026-09-04",
    who: "someone",
    whatTheyDoNow,
    commitment,
  });
  it("caps at 2 with no evidence", () => {
    expect(maxConfidenceAllowed([])).toBe(2);
  });
  it("caps at 2 when entries only contain compliments", () => {
    expect(maxConfidenceAllowed([entry("", "")])).toBe(2);
    expect(maxConfidenceAllowed([entry("   ", "")])).toBe(2);
  });
  it("allows 4 once current behaviour is recorded", () => {
    expect(maxConfidenceAllowed([entry("keeps a spreadsheet nobody updates", "")])).toBe(4);
  });
  it("allows 5 once a commitment is recorded", () => {
    expect(maxConfidenceAllowed([entry("keeps a spreadsheet", "will introduce me to two others")])).toBe(5);
  });
  it("does not allow 5 on a commitment without behaviour", () => {
    expect(maxConfidenceAllowed([entry("", "said they'd pay")])).toBe(2);
  });
});
