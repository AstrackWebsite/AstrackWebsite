"use server";

import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { askAssistant, type AssistantMessage } from "@/lib/ai/assistant";

export type AssistantReply =
  | { ok: true; answer: string }
  | { ok: false; error: string };

/**
 * Answers a compliance question. Takes the conversation so far and returns the
 * assistant's next reply. Read-only — touches no company data.
 */
export async function askAssistantAction(
  messages: AssistantMessage[]
): Promise<AssistantReply> {
  if (!AI_ENABLED) {
    return { ok: false, error: "The assistant is not enabled on this account." };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "Ask a question to get started." };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in again." };

  // Sanitise: only user/assistant roles, non-empty content.
  const clean = messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
    return { ok: false, error: "Ask a question to get started." };
  }

  try {
    const answer = await askAssistant(clean);
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: `Sorry — ${aiErrorReason(err)}.` };
  }
}
