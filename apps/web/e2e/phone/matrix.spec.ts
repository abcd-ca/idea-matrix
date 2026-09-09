import { potential, sampleDocument, score } from "@idea-matrix/core";
import { expect, setUpWithExample, test } from "./helpers";

test("phone matrix: one card per active idea with its stage and numbers, and a tap opens it", async ({ page }) => {
  await setUpWithExample(page);

  // Cards, not a table.
  await expect(page.getByRole("table")).toHaveCount(0);
  const active = sampleDocument().ideas.filter((i) => i.stage !== "Parked");
  const cards = page.getByRole("listitem");
  await expect(cards).toHaveCount(active.length);

  // Each card: name, stage, Score in the corner, Potential and Confidence below.
  for (const idea of active) {
    const card = cards.filter({ hasText: idea.name }).getByRole("button");
    await expect(card).toBeVisible();
    await expect(card).toContainText(idea.stage);
    const p = potential(idea.scores);
    await expect(card).toContainText(`Potential ${p ?? "–"} · Confidence ${idea.confidence}`);
    const s = score(p, idea.confidence);
    if (s !== null) await expect(card.getByText(String(s), { exact: true })).toBeVisible();
  }

  // The list is ranked by Score, so the first card is the top idea; tapping it opens it.
  const ranked = [...active].sort(
    (a, b) => (score(potential(b.scores), b.confidence) ?? -1) - (score(potential(a.scores), a.confidence) ?? -1),
  );
  const first = cards.first().getByRole("button");
  await expect(first).toContainText(ranked[0].name);
  await first.tap();
  await expect(page).toHaveURL(new RegExp(`/idea/\\?id=${encodeURIComponent(ranked[0].id)}$`));
  await expect(page.getByRole("textbox", { name: "Idea name" })).toHaveValue(ranked[0].name);
});
