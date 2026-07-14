"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { getMyContext } from "@/lib/data";
import { notifyOffice } from "@/lib/notify";
import {
  ENCLOSURE_REQUIREMENTS,
  ENCLOSURE_SETUP_CHECKS,
  type SpecialRequirements,
  type SetupCheck,
  type EnclosureSmokeTest,
} from "@/lib/enclosures";

const MAX_PLAN_BYTES = 15 * 1024 * 1024;
const PLAN_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * Add a work area / enclosure to a project, optionally with a plan file. The
 * file lands in the private "plans" bucket under the company's own folder, so
 * storage RLS isolates it per tenant just like the row.
 */
export async function addWorkArea(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the enclosure an ID." };
  const location = String(formData.get("location") ?? "").trim() || null;
  const task_activity = String(formData.get("task_activity") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Special requirements: a checkbox per requirement, each with an optional
  // detail. Only ticked ones are stored.
  const special_requirements: SpecialRequirements = {};
  for (const r of ENCLOSURE_REQUIREMENTS) {
    if (formData.get(`req_${r.key}`) === "on") {
      special_requirements[r.key] = {
        required: true,
        detail: String(formData.get(`detail_${r.key}`) ?? "").trim(),
      };
    }
  }
  const hasReqs = Object.keys(special_requirements).length > 0;

  // Set-up checks (10-point pre-smoke-test checklist) — only stored if any were
  // ticked, so enclosures added without a smoke test stay clean.
  const setupPicked: SetupCheck[] = ENCLOSURE_SETUP_CHECKS.map((label, i) => ({
    label,
    checked: formData.get(`setup_${i}`) === "on",
  }));
  const hasSetup = setupPicked.some((c) => c.checked);

  // Smoke test / handover.
  const smoke: EnclosureSmokeTest = {
    date: String(formData.get("smoke_date") ?? "").trim(),
    startTime: String(formData.get("smoke_start") ?? "").trim(),
    endTime: String(formData.get("smoke_end") ?? "").trim(),
    witness: String(formData.get("smoke_witness") ?? "").trim(),
    analystHandover: formData.get("smoke_analyst_handover") === "on",
    fourStageComplete: formData.get("smoke_4sc") === "on",
  };
  const hasSmoke =
    Boolean(smoke.date || smoke.startTime || smoke.endTime || smoke.witness) ||
    smoke.analystHandover ||
    smoke.fourStageComplete;

  const supabase = createClient();
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company) return { error: "Please sign in again." };

  // Optional plan upload.
  let planPath: string | null = null;
  const file = formData.get("plan");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PLAN_BYTES) return { error: "Plan file must be under 15MB." };
    if (!PLAN_TYPES.has(file.type)) return { error: "Upload a PDF, JPG, PNG or WebP plan." };

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const key = `${ctx.company.id}/${projectId}/${crypto.randomUUID()}-${safe}`;

    // Upload through the service-role client so it doesn't depend on the storage
    // RLS policies being perfectly in place, and auto-create the private bucket
    // the first time so there's no separate Storage setup step. Falls back to the
    // user client if the service role key isn't configured.
    if (ADMIN_ENABLED) {
      const admin = createAdminClient();
      const { data: bucket } = await admin.storage.getBucket("plans");
      if (!bucket) {
        await admin.storage.createBucket("plans", {
          public: false,
          fileSizeLimit: MAX_PLAN_BYTES,
        });
      }
      const { error: upErr } = await admin.storage
        .from("plans")
        .upload(key, file, { contentType: file.type, upsert: false });
      if (upErr) {
        return { error: `Could not upload the plan: ${upErr.message}` };
      }
    } else {
      const { error: upErr } = await supabase.storage
        .from("plans")
        .upload(key, file, { contentType: file.type, upsert: false });
      if (upErr) {
        return { error: `Could not upload the plan: ${upErr.message}` };
      }
    }
    planPath = key;
  }

  const { error } = await supabase.from("work_area").insert({
    project_id: projectId,
    name,
    location,
    task_activity,
    special_requirements: hasReqs ? special_requirements : null,
    setup_checks: hasSetup ? setupPicked : null,
    smoke_test: hasSmoke ? smoke : null,
    notes,
    plan_path: planPath,
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to add work areas." };
    if (/relation .*work_area.* does not exist|does not exist/i.test(error.message)) {
      return { error: "Work area storage isn't set up yet — run migration 0011 in Supabase." };
    }
    return { error: `Could not save the work area: ${error.message}` };
  }

  await notifyOffice({
    projectId,
    kind: "enclosure",
    message: hasSmoke
      ? `recorded enclosure ${name} with a smoke test`
      : `added enclosure ${name}`,
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
