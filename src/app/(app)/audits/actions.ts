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
