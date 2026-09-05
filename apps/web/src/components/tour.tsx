"use client";

import { driver, type DriveStep } from "driver.js";
import { useEffect } from "react";
import { CONFIDENCE_INFO, CRITERION_INFO, CRITERIA, FORMULA_INFO, STAGE_INFO, STAGES } from "@idea-matrix/core";
import { useAppStore } from "@/lib/store";

function list(items: string[]): string {
  return `<ul style="margin:8px 0 0;padding-left:18px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}
function para(text: string): string {
  return `<p style="margin-top:8px">${text}</p>`;
}

// Popover text is built only from the app's own constants, never from user text.
const STEPS: DriveStep[] = [
  {
    element: "[data-tour=stages]",
    popover: {
      title: "Every idea has a stage",
      description:
        "Filter the matrix by where each idea is." +
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
        para(
          "The five scores stay out of this table by default. Tick <b>Show the five scores</b> below it to see them, and <b>hover any column heading</b> to see what its numbers mean.",
        ) +
        list([
          "<b>39 and under</b>: not worth time yet",
          "<b>40 to 59</b>: worth a look",
          "<b>60 to 79</b>: worth a customer conversation",
          "<b>80 and up</b>: worth a serious plan",
        ]),
    },
  },
  {
    element: "[data-tour=confidence]",
    popover: {
      title: "Confidence: how much evidence is behind those scores?",
      description:
        list(Object.entries(CONFIDENCE_INFO.levels).map(([k, v]) => `<b>${k}</b> ${v}`)) +
        para("Every new idea starts at 1, and only talking to people moves it. Three rules for those conversations:") +
        list(CONFIDENCE_INFO.rules) +
        para("The evidence log on each idea keeps the receipts, and Confidence cannot go above 2 without one."),
    },
  },
  {
    element: "[data-tour=score]",
    popover: {
      title: "Score is what ranks your ideas",
      description:
        `<p>${FORMULA_INFO.score}</p>` +
        para("Score can never exceed Potential. The most evidence in the world only proves the idea is as good as you thought."),
    },
  },
  {
    element: "[data-tour=first-row]",
    popover: {
      title: "Click an idea to score it",
      description:
        "<p>This table is for comparing. Scoring happens inside an idea, where each number shows its meaning as you pick, and where the evidence log lives.</p>" +
        para("You can replay this tour any time from Help."),
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
