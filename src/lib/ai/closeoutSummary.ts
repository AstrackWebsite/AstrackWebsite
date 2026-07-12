import "server-only";

import { getClaude, AI_MODEL } from "./client";

// Closeout summary drafting.
// -----------------------------------------------------------------------------
// At project closeout, Claude drafts a professional, client-facing completion
// summary from the project's own record — what was removed, the air-monitoring
// and clearance outcome, and confirmation of safe reoccupation. It writes only
// from the facts passed in; the contractor edits and approves before sending.

export interface CloseoutFacts {
  companyName: string;
  clientName: string | null;
  address: string;
  reference: string;
  classification: string; // licensed | nnlw | general
  startDate: string | null;
  endDate: string | null;
  operativeCount: number;
  airResults: { type: string; resultFml: number | null; pass: boolean | null; sampledOn: string | null }[];
  clearanceReceived: boolean;
  siteClearanceConfirmed: boolean;
}

const SYSTEM_PROMPT = `You write concise, professional project-completion summaries for a UK licensed asbestos removal contractor to send to their client.
Write in UK English, plain and factual, suitable to paste into a handover letter or email.
Only use the facts provided — never invent quantities, dates or results. If clearance was achieved, state that reoccupation is supported by the independent analyst's certificate.
Two or three short paragraphs. No greeting or sign-off (the contractor adds those). No markdown headings — just prose.`;

/** Drafts a client-facing closeout summary paragraph from project facts. */
export async function draftCloseoutSummary(facts: CloseoutFacts): Promise<string> {
  const client = getClaude();

  const passed = facts.airResults.filter((r) => r.pass === true).length;
  const clearance = facts.airResults.filter((r) => r.type === "clearance");
  const factLines = [
    `Contractor: ${facts.companyName}`,
    `Client: ${facts.clientName ?? "not recorded"}`,
    `Site: ${facts.address}`,
    `Project reference: ${facts.reference}`,
    `Classification: ${facts.classification}`,
    `Dates: ${facts.startDate ?? "?"} to ${facts.endDate ?? "?"}`,
    `Operatives deployed: ${facts.operativeCount}`,
    `Air monitoring samples: ${facts.airResults.length} (${passed} passed)`,
    `Clearance (4-stage) tests recorded: ${clearance.length}`,
    `Certificate of reoccupation received: ${facts.clearanceReceived ? "yes" : "no"}`,
    `Site clearance confirmed by supervisor: ${facts.siteClearanceConfirmed ? "yes" : "no"}`,
  ].join("\n");

  const message = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 900,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Draft a client-facing completion summary from these facts:\n\n${factLines}`,
      },
    ],
  });

  const text = message.content
    .filter((b): b is { type: "text"; text: string } & typeof b => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("Could not draft the summary.");
  return text;
}
