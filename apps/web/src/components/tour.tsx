"use client";

import { driver, type DriveStep } from "driver.js";
import { useEffect } from "react";
import {
  CONFIDENCE_GATE_SUMMARY,
  CONFIDENCE_INFO,
  CRITERION_INFO,
  CRITERIA,
  FORMULA_INFO,
  STAGE_INFO,
  STAGES,
} from "@idea-matrix/core";
import { MOM_TEST_URL } from "@/lib/config";
import { MOM_TEST_SUMMARY, OVERVIEW_AI, OVERVIEW_CARDS, OVERVIEW_INTRO, OVERVIEW_TITLE } from "@/lib/overview";
import { useAppStore } from "@/lib/store";

function list(items: string[]): string {
  return `<ul style="margin:8px 0 0;padding-left:18px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}
function para(text: string): string {
  return `<p style="margin-top:8px">${text}</p>`;
}

// The same colours as the pills in the table (light theme values from lib/bands.ts).
const BAND_SWATCH: Record<string, { bg: string; fg: string }> = {
  grey: { bg: "#e5e5e5", fg: "#262626" },
  amber: { bg: "#fde68a", fg: "#451a03" },
  lightGreen: { bg: "#a7f3d0", fg: "#022c22" },
  darkGreen: { bg: "#059669", fg: "#ffffff" },
};
function bandChip(key: keyof typeof BAND_SWATCH, example: string, text: string): string {
  const c = BAND_SWATCH[key];
  return `<span style="display:inline-block;min-width:2.5em;text-align:center;padding:1px 8px;border-radius:6px;font-weight:600;background:${c.bg};color:${c.fg}">${example}</span> ${text}`;
}
const BAND_LIST = list([
  bandChip("grey", "39", "<b>39 and under</b>: not worth time yet"),
  bandChip("amber", "40", "<b>40 to 59</b>: worth a look"),
  bandChip("lightGreen", "60", "<b>60 to 79</b>: worth a customer conversation"),
  bandChip("darkGreen", "80", "<b>80 and up</b>: worth a serious plan"),
]);

// Popover text is built only from the app's own constants, never from user text.
const STEPS: DriveStep[] = [
  {
    // No element: driver.js centres this one on the screen.
    popover: {
      title: OVERVIEW_TITLE,
      description:
        `<p>${OVERVIEW_INTRO}</p>` +
        list(OVERVIEW_CARDS.map((card) => `<b>${card.title}.</b> ${card.text}`)) +
        para(
          `The rules for what counts as evidence come from <a href="${MOM_TEST_URL}" target="_blank" rel="noreferrer" style="text-decoration:underline">The Mom Test</a>: ${MOM_TEST_SUMMARY}`,
        ) +
        para(OVERVIEW_AI),
    },
  },
  {
    element: "[data-tour=stages]",
    popover: {
      title: "Every idea has a stage",
      description:
        "Click a stage to show only the ideas at that stage." +
        list(STAGES.filter((s) => s !== "Parked").map((s) => `<b>${s}</b>: ${STAGE_INFO[s]}`)) +
        para("Parked ideas keep their scores and live under Parked in the menu."),
    },
  },
  {
    element: "[data-tour=potential]",
    popover: {
      title: "Potential: five scores, averaged",
      description:
        `<p>${FORMULA_INFO.potential}</p>` +
        list(CRITERIA.map((c) => `<b>${CRITERION_INFO[c].label}</b>: ${CRITERION_INFO[c].question}`)) +
        para("Each is a value of 1 to 5. Profitability can also be 0, for something deliberately non-commercial.") +
        para(
          "The five scores stay out of this table by default. Tick <b>Show the five scores</b> below it to see them, and <b>hover any column heading</b> to see what its numbers mean.",
        ) +
        para("The colour says which band a number falls in:") +
        BAND_LIST,
    },
  },
  {
    element: "[data-tour=confidence]",
    popover: {
      title: "Confidence: how much evidence is behind those scores?",
      description:
        list(Object.entries(CONFIDENCE_INFO.levels).map(([k, v]) => `<b>${k}</b> ${v}`)) +
        para(
          "Every new idea starts at 1. Desk research can take it to 2; only recorded conversations take it further. Three rules for those conversations:",
        ) +
        list(CONFIDENCE_INFO.rules) +
        para(`The evidence log on each idea keeps the receipts. ${CONFIDENCE_GATE_SUMMARY}`),
    },
  },
  {
    element: "[data-tour=score]",
    popover: {
      title: "Score is what ranks your ideas",
      description:
        `<p>${FORMULA_INFO.score}</p>` +
        para(
          "Score can never exceed Potential. The most evidence in the world only proves the idea is as good as you thought.",
        ) +
        para("Same colours as Potential:") +
        BAND_LIST,
    },
  },
  {
    element: "[data-tour=first-row]",
    popover: {
      title: "Click an idea to score it",
      description:
        "<p>This table is for comparing. Scoring happens inside an idea, where each number shows its meaning as you pick, and where the evidence log lives.</p>" +
        para("You can replay this tour any time from Help, under Show me around."),
    },
  },
];

/**
 * On phones the table is a list of cards, so the column headings the desktop
 * steps point at do not exist. These steps point at the stage chips and the
 * first card instead, and say the same things without "hover" or "tick".
 */
const PHONE_STEPS: DriveStep[] = [
  {
    element: "[data-tour=stages]",
    popover: {
      title: "Every idea has a stage",
      description:
        "Tap a stage to show only the ideas at that stage." +
        list(STAGES.filter((s) => s !== "Parked").map((s) => `<b>${s}</b>: ${STAGE_INFO[s]}`)) +
        para("Parked ideas keep their scores and live under Parked in the menu."),
    },
  },
  {
    element: "[data-tour=first-card]",
    popover: {
      title: "Each card is one idea",
      description:
        "<p>The number in the corner is its <b>Score</b>, which is what ranks your ideas. Below the name: its stage, its <b>Potential</b> and its <b>Confidence</b>.</p>" +
        para(FORMULA_INFO.potential) +
        list(CRITERIA.map((c) => `<b>${CRITERION_INFO[c].label}</b>: ${CRITERION_INFO[c].question}`)) +
        para(
          "Each is a value of 1 to 5. Profitability can also be 0, for something deliberately non-commercial. The colour says which band a number falls in:",
        ) +
        BAND_LIST,
    },
  },
  {
    element: "[data-tour=first-card]",
    popover: {
      title: "Confidence: how much evidence is behind those scores?",
      description:
        list(Object.entries(CONFIDENCE_INFO.levels).map(([k, v]) => `<b>${k}</b> ${v}`)) +
        para(
          "Every new idea starts at 1. Desk research can take it to 2; only recorded conversations take it further. Three rules for those conversations:",
        ) +
        list(CONFIDENCE_INFO.rules) +
        para(`${FORMULA_INFO.score} The evidence log on each idea keeps the receipts. ${CONFIDENCE_GATE_SUMMARY}`),
    },
  },
  {
    element: "[data-tour=first-card]",
    popover: {
      title: "Tap an idea to score it",
      description:
        "<p>This list is for comparing. Scoring happens inside an idea, where each number shows its meaning as you pick, and where the evidence log lives.</p>" +
        para("You can replay this tour any time from Help, under Show me around."),
    },
  },
];

/** The card list replaces the table below Tailwind's md breakpoint. */
function isPhoneLayout(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

export function startTour(): void {
  const instance = driver({
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    allowClose: true,
    // Phones get the same welcome step first, then steps that point at the cards.
    steps: isPhoneLayout() ? [STEPS[0], ...PHONE_STEPS] : STEPS,
    onDestroyed: () => useAppStore.getState().setTourPending(false),
  });
  instance.drive();
}

/** Runs the tour once after setup, when the matrix is on screen. */
export function TourAutostart() {
  const pending = useAppStore((s) => s.tourPending);
  const hasDoc = useAppStore((s) => s.doc !== null);
  useEffect(() => {
    if (!pending || !hasDoc) return;
    const t = setTimeout(() => startTour(), 400);
    return () => clearTimeout(t);
  }, [pending, hasDoc]);
  return null;
}
