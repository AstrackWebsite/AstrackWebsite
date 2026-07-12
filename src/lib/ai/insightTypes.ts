// Shared insight shapes — safe to import from both client and server (no SDK,
// no server-only guard). Used by the generic InsightsPanel and the exposure /
// audit insight server actions.

export type InsightTone = "default" | "ok" | "warn" | "danger";

export interface InsightSection {
  title: string;
  tone?: InsightTone;
  items: string[];
}

export interface InsightResult {
  summary: string;
  sections: InsightSection[];
}

export type InsightState =
  | { ok: true; result: InsightResult }
  | { ok: false; error: string };
