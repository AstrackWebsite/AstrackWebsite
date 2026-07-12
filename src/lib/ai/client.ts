import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// AsTrack AI layer.
// -----------------------------------------------------------------------------
// Every AI feature is gated behind ANTHROPIC_API_KEY. With no key the flag is
// false, the helpers throw a friendly error, and the UI hides the AI entry
// points — so the app runs perfectly well without AI configured. The key is
// read only on the server; it must never be exposed to the browser (do NOT
// prefix it with NEXT_PUBLIC_).

/** True when an Anthropic API key is configured — drives all AI feature flags. */
export const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * The model AsTrack uses for every AI feature. Opus is the strongest model for
 * careful reading of certificates, lab reports and compliance text — where a
 * misread date has real consequences.
 */
export const AI_MODEL = "claude-opus-4-8";

let cached: Anthropic | null = null;

/**
 * Returns the shared Anthropic client, or throws if AI is not configured.
 * Call sites should check {@link AI_ENABLED} first and surface a graceful
 * message rather than letting this throw.
 */
export function getClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "AI is not configured. Add ANTHROPIC_API_KEY to enable AI features."
    );
  }
  if (!cached) {
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}
