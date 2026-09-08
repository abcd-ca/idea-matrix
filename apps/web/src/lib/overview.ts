/**
 * The three-sentence version of what Idea Matrix is. Shown on the welcome
 * screen of first-run setup and as the opening stop of the tour, from the
 * same words so the two never drift apart. App constants only, no user text.
 */
export const OVERVIEW_TITLE = "Score your project ideas honestly";

export const OVERVIEW_INTRO =
  "Idea Matrix is a place to keep your project ideas, at whatever stage they are, and to explore which ones deserve your time.";

export const OVERVIEW_CARDS: { title: string; text: string }[] = [
  {
    title: "How an idea is scored",
    text: "Each idea gets a value of 1 to 5 for Reach, Impact, Profitability, Vision and Ease. Together they give its Potential: how good it could be.",
  },
  {
    title: "Confidence keeps you honest",
    text: "A separate score for how much evidence sits behind those numbers, from gut feel to a customer commitment. Score is Potential × Confidence ÷ 5, so nothing ranks high until real people have backed it up.",
  },
  {
    title: "Private by design",
    text: "Your ideas stay yours on purpose. There are no accounts and no server: your matrix is one file in your own storage, and nothing leaves your computer. You do not have to take the app’s word for it. Watch the browser’s Network tab, or read the open-source code.",
  },
];

export const OVERVIEW_AI =
  "Use it here in the browser, or connect it to your AI assistant and work through your ideas in conversation.";

export const MOM_TEST_SUMMARY =
  "talk about people’s lives, not your idea; ask what they did, not what they would do; only a commitment counts as proof.";
