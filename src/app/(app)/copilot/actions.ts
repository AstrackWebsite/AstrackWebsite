"use server";

import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED } from "@/lib/ai/client";
import { askCopilot } from "@/lib/ai/copilot";
import { buildCompanySnapshot } from "@/lib/ai/snapshot";
import type { ChatMsg, ChatReply } from "@/lib/ai/chatTypes";

/**
 * Answers a question about the company's own data. Builds a fresh RLS-scoped
 * snapshot each call and reasons over it — read-only, no writes, no cross-company
 * access.
 */
export async function askCopilotAction(messages: ChatMsg[]): Promise<ChatReply> {
  if (!AI_ENABLED) {
    return { ok: false, error: "The copilot is not enabled on this account." };
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "Ask a question to get started." };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in again." };

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
    const snapshot = await buildCompanySnapshot();
    const answer = await askCopilot(snapshot, clean);
    return { ok: true, answer };
  } catch {
    return { ok: false, error: "Sorry — I couldn't answer that just now. Try again." };
  }
}
