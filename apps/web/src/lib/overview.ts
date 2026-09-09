import type { TFunction } from "i18next";

/**
 * The three-sentence version of what Idea Matrix is. Shown on the welcome
 * screen of first-run setup and as the opening stop of the tour, from the
 * same keys so the two never drift apart. The text itself is under
 * `overview` in locales/<language>/common.json. App constants only, no user
 * text.
 */
export const OVERVIEW_CARD_KEYS = ["scoring", "confidence", "private"] as const;

export interface Overview {
  title: string;
  intro: string;
  cards: { title: string; text: string }[];
  ai: string;
  /** The Mom Test in one line, quoted after "The rules for what counts as evidence come from The Mom Test:". */
  momTest: string;
}

export function overview(t: TFunction): Overview {
  return {
    title: t("overview.title", { ns: "common" }),
    intro: t("overview.intro", { ns: "common" }),
    cards: OVERVIEW_CARD_KEYS.map((key) => ({
      title: t(`overview.cards.${key}.title`, { ns: "common" }),
      text: t(`overview.cards.${key}.text`, { ns: "common" }),
    })),
    ai: t("overview.ai", { ns: "common" }),
    momTest: t("overview.momTest", { ns: "common" }),
  };
}
