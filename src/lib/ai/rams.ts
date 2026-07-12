import "server-only";

import { getClaude, AI_MODEL } from "./client";

// RAMS draft generator.
// -----------------------------------------------------------------------------
// Produces a first-draft Risk Assessment & Method Statement for an asbestos
// project from its record. RAMS are safety-critical and site-specific, so this
// is explicitly a *draft* skeleton: it marks assumptions and leaves clearly-
// labelled placeholders wherever survey-specific detail is needed, for a
// competent person to complete, review and approve. AI drafts, a human signs.

export interface RamsFacts {
  companyName: string;
  clientName: string | null;
  address: string;
  reference: string;
  classification: string; // Licensed | Non-licensed (NNLW) | General
  asb5Date: string | null;
  startDate: string | null;
  endDate: string | null;
  contractsManager: string | null;
  supervisor: string | null;
}

const SYSTEM_PROMPT = `You are a health-and-safety author for a UK licensed asbestos removal contractor, drafting a Risk Assessment & Method Statement (RAMS) under the Control of Asbestos Regulations 2012 and HSG247.

Write a clear, professional first-draft RAMS in UK English as structured prose with headed sections. Include, as appropriate to the work type:
1. Project & contractor details
2. Scope of works
3. Asbestos details (type, location, condition) — from the survey
4. Legal status (licensed/notifiable, ASB5 / 14-day notification, plan of work)
5. Key hazards & risk assessment (asbestos fibres, work at height, manual handling, electrical, etc.) with control measures
6. Method statement — sequential steps (set-up, enclosure & smoke test, controlled removal, cleaning, air monitoring, 4-stage clearance, dismantling)
7. RPE & PPE
8. Decontamination & welfare
9. Air monitoring & clearance strategy (control limit 0.1 f/ml; clearance indicator 0.01 f/ml)
10. Waste management (double-bagged, UN-approved, consigned hazardous waste)
11. Emergency procedures (fibre release, injury, first aid, spill)
12. Sign-off block (prepared by / reviewed by / date)

CRITICAL RULES:
- This is a DRAFT for a competent person to complete and approve. Never present it as a final, approved document.
- You do not have the asbestos survey or site specifics. Wherever site-specific information is required (asbestos type & location, quantities, enclosure dimensions, access, isolation points, named personnel, dates), insert a clearly-marked placeholder like [INSERT: …] rather than inventing details. Do not fabricate survey findings, quantities or results.
- Begin the document with a short bold note that it is an AI-generated draft requiring review, completion and approval by a competent person before use.`;

/** Returns a streaming RAMS draft for the given project facts. */
export function streamRams(facts: RamsFacts) {
  const client = getClaude();

  const factLines = [
    `Contractor: ${facts.companyName}`,
    `Client: ${facts.clientName ?? "[INSERT: client]"}`,
    `Site address: ${facts.address}`,
    `Project reference: ${facts.reference}`,
    `Work classification: ${facts.classification}`,
    `ASB5 / notification date: ${facts.asb5Date ?? "[INSERT if licensed]"}`,
    `Programme: ${facts.startDate ?? "[INSERT start]"} to ${facts.endDate ?? "[INSERT end]"}`,
    `Contracts manager: ${facts.contractsManager ?? "[INSERT]"}`,
    `Site supervisor: ${facts.supervisor ?? "[INSERT]"}`,
  ].join("\n");

  return client.messages.stream({
    model: AI_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Draft a RAMS for this project. Use placeholders for anything not given here:\n\n${factLines}`,
      },
    ],
  });
}
