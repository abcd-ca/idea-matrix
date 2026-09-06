import { CONFIDENCE_INFO, CRITERION_INFO, CRITERIA, STAGE_INFO, STAGES } from "@idea-matrix/core";

/**
 * The "next idea" walkthrough, offered to the assistant as an MCP prompt.
 * This is the conversation the app's owner has been having by hand: read the
 * idea, ask the one or two questions that change the score most, propose
 * scores with reasons, and only write once the person agrees. The Mom Test
 * rules keep Confidence honest.
 */
export function walkthroughPrompt(ideaName?: string): string {
  const target = ideaName
    ? `The idea to work on is "${ideaName}". Find it with list_ideas and read it with get_idea.`
    : `Call list_ideas, then pick the next idea worth attention: one that is unscored, or scored with Confidence 1 and no evidence, or whose stage has not moved in a while. Say which one you picked and why in one sentence.`;

  const scales = CRITERIA.map((c) => {
    const info = CRITERION_INFO[c];
    const levels = Object.entries(info.levels)
      .map(([k, v]) => `${k} = ${v}`)
      .join("; ");
    return `- ${info.label}: ${info.question} ${levels}.`;
  }).join("\n");

  const confidence = Object.entries(CONFIDENCE_INFO.levels)
    .map(([k, v]) => `${k} = ${v}`)
    .join("; ");

  const stages = STAGES.map((s) => `- ${s}: ${STAGE_INFO[s]}`).join("\n");

  return `You are helping me score one idea in my Idea Matrix, using the tools from the idea-matrix MCP server. Work through it as a conversation, not a form.

${target}

How to run the conversation:
1. Summarise the idea, its current scores and what looks missing or stale in two or three sentences. Use get_idea; do not guess.
2. Ask me the one or two questions that most change the score, rather than a checklist. Wait for my answers before proposing anything.
3. Propose the five scores with a one-line reason each, and a riskiest assumption if there is none: one testable sentence about other people's current behaviour or spending, never about whether they would like the idea.
4. Push back if my scores seem inconsistent with what I have said, or with how I scored other ideas.
5. Only when I agree, write the changes with update_idea, touching only the fields we discussed. Then report the resulting Potential and Score and stop. Do not move on to another idea unless I ask.

Rules that do not bend:
- Confidence is about evidence, not enthusiasm. ${confidence}.
- Confidence cannot go above 2 unless the evidence log has an entry recording what someone currently does about the problem, and cannot reach 5 without a recorded commitment. If I describe a real conversation, record it with add_evidence first (who, what they do now, any commitment), then raise Confidence. If the tool refuses a Confidence value, explain the gate rather than working around it.
- The three Mom Test rules for any conversation I report: talk about their life, not the idea; ask what they did, not what they would do; only a commitment counts as proof. Compliments and "I'd totally use that" do not count as evidence.
- Re-evaluate Ease with today's tools in mind (AI coding assistants, cheap hardware, better platforms), not the tools available when the idea was first written down.
- Never delete an idea. If it is dead, use park_idea with a reason.

Scales (1 to 5; Profitability may be 0 for a deliberately non-commercial idea):
${scales}

Potential is the average of the five scores scaled to 0 to 100, blank until all five are filled. Score is Potential × Confidence ÷ 5. Bands: 39 and under not worth time yet; 40 to 59 worth a look; 60 to 79 worth a customer conversation; 80 and up worth a serious plan.

Stages:
${stages}

Write everything you put into the matrix in Canadian English, in the first person singular as if I wrote it, and with few em-dashes.`;
}

export function reviewPrompt(): string {
  return `Read my whole Idea Matrix with list_ideas (include parked ideas) and give me a short, honest review in plain prose:

1. The three ideas most worth a customer conversation next, and the single question I should ask someone for each. Judge by Potential, but say plainly where a high Potential rests on Confidence 1.
2. Any idea whose scores look inconsistent with its description or with how similar ideas are scored.
3. Ideas that have sat at Confidence 1 with no evidence for a long time and should probably be parked, with a suggested reason for each. Do not park anything; just suggest.
4. Anything missing a riskiest assumption, with a suggested sentence about other people's current behaviour.

Do not change the matrix during this review.`;
}
