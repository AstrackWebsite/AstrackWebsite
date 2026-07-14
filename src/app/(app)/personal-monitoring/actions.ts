"use server";

import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { analyzeExposure } from "@/lib/ai/exposureInsights";
import { getAllExposure, getProjects, getStaff, staffNameMap } from "@/lib/data";
import { ASBESTOS_TYPE_LABEL } from "@/lib/roles";
import type { InsightState } from "@/lib/ai/insightTypes";

/**
 * Generates AI insight over the company's exposure records. Read-only — reads
 * data the caller can already see via RLS and returns analysis only.
 */
export async function exposureInsightAction(): Promise<InsightState> {
  if (!AI_ENABLED) {
    return { ok: false, error: "AI insights are not enabled on this account." };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in again." };

  try {
    const [exposure, projects, staff] = await Promise.all([
      getAllExposure(),
      getProjects(),
      getStaff(),
    ]);
    if (exposure.length === 0) {
      return { ok: false, error: "No exposure records to analyse yet." };
    }
    const projectAddr = new Map(projects.map((p) => [p.id, p.address]));
    const names = staffNameMap(staff);

    const rows = exposure.map((e) => ({
      name: names.get(e.staff_id) ?? "Unknown",
      task: e.task,
      asbestos: e.asbestos_type ? ASBESTOS_TYPE_LABEL[e.asbestos_type] : null,
      twa: e.twa_4h,
      date: e.entry_date,
      project: projectAddr.get(e.project_id) ?? "",
    }));

    const result = await analyzeExposure(rows);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: `Couldn't generate insights — ${aiErrorReason(err)}.` };
  }
}
