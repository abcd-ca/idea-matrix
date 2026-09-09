"use client";

import { driver, type DriveStep } from "driver.js";
import { useEffect } from "react";
import { BANDS, CRITERIA, STAGES, type Band } from "@idea-matrix/core";
import { MOM_TEST_URL } from "@/lib/config";
import { overview } from "@/lib/overview";
import { useAppStore } from "@/lib/store";
import { coreLevels, coreRules, i18n } from "@/lib/i18n";
import type { TFunction } from "i18next";

function list(items: string[]): string {
  return `<ul style="margin:8px 0 0;padding-left:18px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}
function para(text: string): string {
  return `<p style="margin-top:8px">${text}</p>`;
}
/** Turn the bare `<a>` a translation carries into a real link. */
function link(html: string, url: string): string {
  return html.replace("<a>", `<a href="${url}" target="_blank" rel="noreferrer" style="text-decoration:underline">`);
}

// The same colours as the pills in the table (light theme values from lib/bands.ts).
const BAND_SWATCH: Record<Band, { bg: string; fg: string }> = {
  grey: { bg: "#e5e5e5", fg: "#262626" },
  amber: { bg: "#fde68a", fg: "#451a03" },
  lightGreen: { bg: "#a7f3d0", fg: "#022c22" },
  darkGreen: { bg: "#059669", fg: "#ffffff" },
};
function bandChip(key: Band, text: string): string {
  const c = BAND_SWATCH[key];
  return `<span style="display:inline-block;min-width:2.5em;text-align:center;padding:1px 8px;border-radius:6px;font-weight:600;background:${c.bg};color:${c.fg}">${BANDS[key].min}</span> ${text}`;
}

/**
 * Popover text is built only from the app's own constants (the locale files
 * and core's scales), never from user text. Built when the tour starts, in
 * the current language.
 */
function steps(t: TFunction): { desktop: DriveStep[]; phone: DriveStep[] } {
  const core = (key: string, values?: Record<string, unknown>) => t(key, { ns: "core", ...values });
  const o = overview(t);
  const bandList = list(
    (Object.keys(BANDS) as Band[]).map((key) =>
      bandChip(key, t(`bands.${key}`, { advice: core(`band.${key}.advice`) })),
    ),
  );
  const stageList = list(
    STAGES.filter((s) => s !== "Parked").map((s) =>
      t("line.stage", { stage: core(`stageName.${s}`), description: core(`stage.${s}`) }),
    ),
  );
  const criteriaList = list(
    CRITERIA.map((c) =>
      t("line.criterion", { label: core(`criterion.${c}.label`), question: core(`criterion.${c}.question`) }),
    ),
  );
  const confidenceLevels = list(
    Object.entries(coreLevels(t, "confidence.levels")).map(([k, v]) => t("line.level", { level: k, meaning: v })),
  );
  const rules = list(coreRules(t));
  const gate = core("gateSummary");
  const showScores = t("showScores", { ns: "matrix" });

  const welcome: DriveStep = {
    // No element: driver.js centres this one on the screen.
    popover: {
      title: o.title,
      description:
        `<p>${o.intro}</p>` +
        list(o.cards.map((card) => t("line.card", { title: card.title, text: card.text }))) +
        para(link(t("overview.momTestFrom", { ns: "common", momTest: o.momTest }), MOM_TEST_URL)) +
        para(o.ai),
    },
  };

  const desktop: DriveStep[] = [
    welcome,
    {
      element: "[data-tour=stages]",
      popover: {
        title: t("stages.title"),
        description: t("stages.click") + stageList + para(t("stages.parked")),
      },
    },
    {
      element: "[data-tour=potential]",
      popover: {
        title: t("potential.title"),
        description:
          `<p>${core("formula.potential")}</p>` +
          criteriaList +
          para(t("potential.each")) +
          para(t("potential.hidden", { showScores })) +
          para(t("potential.colour")) +
          bandList,
      },
    },
    {
      element: "[data-tour=confidence]",
      popover: {
        title: t("confidence.title"),
        description: confidenceLevels + para(t("confidence.starts")) + rules + para(t("confidence.receipts", { gate })),
      },
    },
    {
      element: "[data-tour=score]",
      popover: {
        title: t("score.title"),
        description: `<p>${core("formula.score")}</p>` + para(t("score.cap")) + para(t("score.sameColours")) + bandList,
      },
    },
    {
      element: "[data-tour=first-row]",
      popover: {
        title: t("open.title"),
        description: `<p>${t("open.text")}</p>` + para(t("open.replay")),
      },
    },
  ];

  /**
   * On phones the table is a list of cards, so the column headings the desktop
   * steps point at do not exist. These steps point at the stage chips and the
   * first card instead, and say the same things without "hover" or "tick".
   */
  const phone: DriveStep[] = [
    welcome,
    {
      element: "[data-tour=stages]",
      popover: {
        title: t("stages.title"),
        description: t("stages.tap") + stageList + para(t("stages.parked")),
      },
    },
    {
      element: "[data-tour=first-card]",
      popover: {
        title: t("phone.cardTitle"),
        description:
          `<p>${t("phone.cardText")}</p>` +
          para(core("formula.potential")) +
          criteriaList +
          para(t("phone.eachColour")) +
          bandList,
      },
    },
    {
      element: "[data-tour=first-card]",
      popover: {
        title: t("confidence.title"),
        description:
          confidenceLevels +
          para(t("confidence.starts")) +
          rules +
          para(t("phone.receipts", { score: core("formula.score"), gate })),
      },
    },
    {
      element: "[data-tour=first-card]",
      popover: {
        title: t("phone.openTitle"),
        description: `<p>${t("phone.openText")}</p>` + para(t("open.replay")),
      },
    },
  ];

  return { desktop, phone };
}

/** The card list replaces the table below Tailwind's md breakpoint. */
function isPhoneLayout(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

export function startTour(): void {
  const t = i18n.getFixedT(null, "tour");
  const { desktop, phone } = steps(t);
  const instance = driver({
    showProgress: true,
    // driver.js fills {{current}} and {{total}} itself; i18next leaves unknown placeholders alone.
    progressText: t("progress"),
    nextBtnText: t("next"),
    prevBtnText: t("back"),
    doneBtnText: t("done"),
    allowClose: true,
    // Phones get the same welcome step first, then steps that point at the cards.
    steps: isPhoneLayout() ? phone : desktop,
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
    const timer = setTimeout(() => startTour(), 400);
    return () => clearTimeout(timer);
  }, [pending, hasDoc]);
  return null;
}
