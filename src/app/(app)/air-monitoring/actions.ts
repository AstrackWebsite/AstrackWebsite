"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { airPasses } from "@/lib/compliance";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { scanAirReport, type AirReportResult } from "@/lib/ai/airReport";
import type { AirMonitoringType } from "@/lib/types";

const AIR_TYPES: AirMonitoringType[] = [
  "background",
  "leak",
  "reassurance",
  "clearance",
];

export async function createAirResult(_prev: unknown, formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const type = String(formData.get("type") ?? "") as AirMonitoringType;
  const resultRaw = String(formData.get("result_fml") ?? "").trim();
  const sampledOn = String(formData.get("sampled_on") ?? "").trim();
  const supervisorId = String(formData.get("supervisor_id") ?? "").trim();
  const passRaw = String(formData.get("pass") ?? "").trim();

  if (!projectId) return { error: "Choose a project." };
  if (!AIR_TYPES.includes(type)) return { error: "Choose a test type." };

  const resultFml = resultRaw === "" ? null : Number(resultRaw);
  if (resultFml != null && (Number.isNaN(resultFml) || resultFml < 0)) {
    return { error: "Enter a valid fibre result in f/ml." };
  }

  // Pass defaults to the type-aware suggestion, but an explicit choice wins.
  const pass =
    passRaw === "pass" ? true : passRaw === "fail" ? false : airPasses(type, resultFml);

  const row: Record<string, string | number | boolean | null> = {
    project_id: projectId,
    type,
    result_fml: resultFml,
    pass,
    sampled_on: sampledOn || null,
    supervisor_id: supervisorId || null,
  };

  const supabase = createClient();
  const { error } = await supabase.from("air_monitoring_result").insert(row);

  if (error) {
    if (error.code === "42501" || /policy/i.test(error.message)) {
      return { error: "You don't have permission to log air results." };
    }
    return { error: "Could not save the air result. Please try again." };
  }

  revalidatePath("/air-monitoring");
  redirect("/air-monitoring");
}

export type AirScanState =
  | { ok: true; result: AirReportResult }
  | { ok: false; error: string }
  | Record<string, never>;

/**
 * Reads an uploaded air-monitoring certificate with AI and returns the
 * extracted result for the operator to confirm. Read-only — never writes.
 */
export async function scanAirReportAction(
  _prev: AirScanState,
  formData: FormData
): Promise<AirScanState> {
  if (!AI_ENABLED) {
    return { ok: false, error: "AI scanning is not enabled on this account." };
  }

  const file = formData.get("report");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF or photo of the certificate." };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { ok: false, error: "That file is too large. Keep it under 12MB." };
  }
  const okType =
    file.type === "application/pdf" ||
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type);
  if (!okType) return { ok: false, error: "Upload a PDF, JPG or PNG." };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Please sign in again." };

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await scanAirReport(base64, file.type);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: `Couldn't read that certificate — ${aiErrorReason(err)}. Enter the result manually.`,
    };
  }
}
