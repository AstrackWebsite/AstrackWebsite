"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyContext } from "@/lib/data";

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
  if (!name) return { error: "Give the work area a name." };
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

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
    const { error: upErr } = await supabase.storage
      .from("plans")
      .upload(key, file, { contentType: file.type, upsert: false });
    if (upErr) {
      return { error: "Could not upload the plan. Check the file and try again." };
    }
    planPath = key;
  }

  const { error } = await supabase.from("work_area").insert({
    project_id: projectId,
    name,
    location,
    notes,
    plan_path: planPath,
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to add work areas." };
    return { error: "Could not save the work area. Please try again." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
