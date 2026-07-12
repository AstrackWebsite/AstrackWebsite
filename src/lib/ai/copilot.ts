import "server-only";

import { getClaude, AI_MODEL } from "./client";
import type { ChatMsg } from "./chatTypes";

// Data copilot.
// -----------------------------------------------------------------------------
// Answers plain-language questions about the signed-in company's own data using
// a snapshot that is already scoped to their company by RLS. It reasons over the
// snapshot only — it never has database write access and cannot see other
// companies' data.

const SYSTEM_PROMPT = `You are AsTrack Copilot, helping staff at a UK licensed asbestos removal contractor query their own compliance data.
You are given a SNAPSHOT of the company's current data (staff and certificate status, projects, plant, incidents, audits, exposure). Answer questions using ONLY that snapshot.
Rules:
- Base every answer strictly on the snapshot. If the answer isn't in it, say so plainly — never guess or invent names, dates or figures.
- Be concise and specific: name people, references and dates. Use short lists.
- Flag compliance risks you notice (expired certs blocking site access, expired plant certificates, over-limit exposure, open RIDDOR incidents) even if not directly asked, when relevant to the question.
- You are a read-only assistant. If asked to change data, explain you can't and point to the relevant screen.
- Dates are ISO (YYYY-MM-DD). "Today" is given in the snapshot.`;

/** Answers a question over the company snapshot given the conversation so far. */
export async function askCopilot(
  snapshot: string,
  messages: ChatMsg[]
): Promise<string> {
  const client = getClaude();

  const trimmed = messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 3000),
  }));

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    system: `${SYSTEM_PROMPT}\n\n=== COMPANY SNAPSHOT ===\n${snapshot}`,
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
