import "server-only";

import { getClaude, AI_MODEL } from "./client";

// On-site compliance assistant.
// -----------------------------------------------------------------------------
// A plain-language question-and-answer helper for UK asbestos compliance —
// CAR 2012, HSG247/248, the licensing regime, RIDDOR, waste (HWR 2005) and
// standard site practice. It is guidance to help a competent person, never a
// substitute for the licensed contractor's own judgement, a written risk
// assessment, or formal HSE advice — the prompt makes the model say so.

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are the AsTrack Compliance Assistant, helping staff at a UK licensed asbestos removal contractor.
You answer practical questions about UK asbestos regulation and good practice: the Control of Asbestos Regulations 2012 (CAR 2012), HSG247 (licensed work) and HSG248 (analysts' guide / air monitoring), the HSE licensing regime and ASB5 notification, the 4-stage clearance process, the control limit (0.1 f/ml over 4 hours) and clearance indicator (0.01 f/ml), RPE/face-fit and medicals, RIDDOR 2013 reporting, and hazardous waste handling.

Style:
- Be concise, practical and plain. Use UK spelling. Prefer short paragraphs or bullet points a supervisor can act on.
- When you cite a rule, name the source (e.g. "CAR 2012 reg 4", "HSG247") so it can be checked.
- If a question is outside asbestos/health-and-safety, say it's outside your scope.

Safety:
- You give general guidance, not legal advice or a site-specific decision. For anything consequential — reportability, whether work is licensable, clearance sign-off — tell the user to confirm with their competent person, the written risk assessment/plan of work, the independent analyst, or the HSE.
- Never guess figures or invent regulation numbers. If you are unsure, say so.`;

/**
 * Answers a compliance question given the conversation so far.
 * @param messages Prior turns (user/assistant), oldest first, last is the new question.
 */
export async function askAssistant(messages: AssistantMessage[]): Promise<string> {
  const client = getClaude();

  // Keep the context bounded — last 12 turns, each capped in length.
  const trimmed = messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 4000),
  }));

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: trimmed,
  });

  const text = message.content
    .filter((b): b is { type: "text"; text: string } & typeof b => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("No answer.");
  return text;
}
