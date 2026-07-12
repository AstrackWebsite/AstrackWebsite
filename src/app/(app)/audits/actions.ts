"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AUDIT_SECTIONS,
  itemId,
  scoreResponses,
  type AuditResult,
  type AuditResponse,
} from "@/lib/auditTemplate";
import { AI_ENABLED } from "@/lib/ai/client";
import { analyzeAudits } from "@/lib/ai/auditInsights";
import { getAudits, getProjects } from "@/lib/data";
import type { InsightState } from "@/lib/ai/insightTypes";

const RESULTS: AuditResult[] = ["pass", "fail", "na"];

export async function createAudit(_prev: unknown, formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const auditDate = get("audit_date");
  if (!auditDate) return { error: "Enter the audit date." };
  const projectId = get("project_id");
  if (!projectId) return { error: "Choose the site (project) audited." };

  // Collect responses from the fixed template.
  const responses: AuditResponse[] = [];
  AUDIT_SECTIONS.forEach((section, si) => {
    section.items.forEach((label, ii) => {
      const raw = get(itemId(si, ii));
      const result = (RESULTS.includes(raw as AuditResult) ? raw : "na") as AuditResult;
      responses.push({ category: section.category, label, result });
    });
  });

  const score = scoreResponses(responses);

  const supabase = createClient();
  const { error } = await supabase.from("audit").insert({
    project_id: projectId,
    auditor_staff_id: get("auditor_staff_id") || null,
    audit_date: auditDate,
    score,
    responses,
    notes: get("notes") || null,
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to record audits." };
    return { error: "Could not save the audit. Please try again." };
  }

  revalidatePath("/audits");
  redirect("/audits");
}

/**
 * Generates AI insight across the company's audit history. Read-only — analysis
 * only, no writes. Gated behind ANTHROPIC_API_KEY.
 */
export async function auditInsightAction(): Promise<InsightState> {
  if (!AI_ENABLED) {
    return { ok: false, error: "AI insights are not enabled on this account." };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in again." };

  try {
    const [audits, projects] = await Promise.all([getAudits(), getProjects()]);
    if (audits.length === 0) {
      return { ok: false, error: "No audits to analyse yet." };
    }
    const projectAddr = new Map(projects.map((p) => [p.id, p.address]));

    const summaries = audits.map((a) => ({
      date: a.audit_date,
      site: a.project_id ? projectAddr.get(a.project_id) ?? "Site audit" : "Site audit",
      score: a.score,
      fails: (a.responses ?? [])
        .filter((r) => r.result === "fail")
        .map((r) => ({ category: r.category, label: r.label })),
    }));

    const result = await analyzeAudits(summaries);
    return { ok: true, result };
  } catch {
    return { ok: false, error: "Couldn't generate insights. Please try again." };
  }
}
