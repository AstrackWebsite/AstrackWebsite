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

/**
 * Turns an AI error into a short, user-safe reason so a failed call explains
 * itself instead of a generic "try again". Recognises the common setup
 * problems — bad key, no credit, unknown model — so they can be fixed fast.
 */
export function aiErrorReason(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    if (status === 401) return "the API key was rejected — check ANTHROPIC_API_KEY is correct";
    if (status === 403) return "the API key isn't permitted to use this — check your Anthropic account";
    if (status === 400 && /credit|balance|billing/i.test(err.message))
      return "the Anthropic account has no credit — add billing at console.anthropic.com";
    if (status === 404) return "the AI model wasn't found for this account";
    if (status === 429) return "rate limit or quota reached — try again shortly, or check your Anthropic plan";
    if (status && status >= 500) return "the AI service is temporarily unavailable — try again shortly";
    return `the AI service returned an error (${status ?? "?"})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return "an unexpected error occurred";
}
