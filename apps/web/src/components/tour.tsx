"use client";

import { driver, type DriveStep } from "driver.js";
import { useEffect } from "react";
import { CONFIDENCE_INFO, CRITERION_INFO, CRITERIA, FORMULA_INFO, STAGE_INFO, STAGES } from "@idea-matrix/core";
import { useAppStore } from "@/lib/store";

function list(items: string[]): string {
  return `<ul style="margin:8px 0 0;padding-left:18px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

// Descriptions below are built from the app's own constants, never from user text.
const STEPS: DriveStep[] = [
  {
    element: "[data-tour=stages]",
    popover: {
      title: "Every idea has a stage",
      description:
        "Filter the matrix by where each idea is." +
        list(STAGES.filter((s) => s !== "Parked").map((s) => `<b>${s}</b>: ${STAGE_INFO[s]}`)) +
        "<p style='margin-top:8px'>Parked ideas keep their scores and live under Parked in the menu.</p>",
    },
  },
  {
    element: "[data-tour=scores]",
    popover: {
      title: "Five scores, each from 1 to 5",
      description:
        list(
          CRITERIA.map(
            (c) => `<b>${CRITERION_INFO[c].label}</b>: ${CRITERION_INFO[c].question} 1 = ${CRITERION_INFO[c].levels[1]}, 5 = ${CRITERION_INFO[c].levels[5]}.`,
          ),
        ) + "<p style='margin-top:8px'>Change any number right here in the table. Each score's meaning shows as you pick.</p>",
    },
  },
  {
    element: "[data-tour=confidence]",
    popover: {
      title: "Confidence: how much evidence is behind those scores?",
      description:
        list(Object.entries(CONFIDENCE_INFO.levels).map(([k, v]) => `<b>${k}</b> ${v}`)) +
        `<p style='margin-top:8px'>Every new idea starts at 1, and only talking to people moves it. Three rules for those conversations:</p>` +
        list(CONFIDENCE_INFO.rules) +
        "<p style='margin-top:8px'>The evidence log on each idea keeps the receipts, and Confidence cannot go above 2 without one.</p>",
    },
  },
  {
    element: "[data-tour=potential]",
    popover: {
      title: "Potential",
      description:
        `<p>${FORMULA_INFO.potential}</p>` +
        list([
          "<b>39 and under</b>: not worth time yet",
          "<b>40 to 59</b>: worth a look",
          "<b>60 to 79</b>: worth a customer conversation",
          "<b>80 and up</b>: worth a serious plan",
        ]),
    },
  },
  {
    element: "[data-tour=score]",
    popover: {
      title: "Score is what ranks your ideas",
      description:
        `<p>${FORMULA_INFO.score}</p><p style='margin-top:8px'>Score can never exceed Potential. The most evidence in the world only proves the idea is as good as you thought.</p>`,
    },
  },
];

export function startTour(): void {
  const instance = driver({
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    allowClose: true,
    steps: STEPS,
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
