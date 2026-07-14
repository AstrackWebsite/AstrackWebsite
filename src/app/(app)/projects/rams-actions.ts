"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { getMyContext, getProjectById } from "@/lib/data";
import { isOfficeRole } from "@/lib/types";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { scanRams, formatRamsSummary, isScannable } from "@/lib/ai/ramsScan";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Attach (upload) a RAMS document to a project. Office/management only. */
export async function uploadRams(projectId: string, formData: FormData) {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company) return { error: "Please sign in again." };
  if (!isOfficeRole(ctx.profile?.app_role)) {
    return { error: "Only the office can upload RAMS." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a RAMS file to upload." };
  }
  if (file.size > MAX_BYTES) return { error: "Keep the file under 15MB." };
  if (file.type && !ALLOWED.has(file.type)) {
    return { error: "Upload a PDF or an image." };
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${ctx.company.id}/rams/${projectId}/${crypto.randomUUID()}-${safe}`;

  if (ADMIN_ENABLED) {
    const admin = createAdminClient();
    const { data: bucket } = await admin.storage.getBucket("attachments");
    if (!bucket) {
      await admin.storage.createBucket("attachments", {
        public: false,
        fileSizeLimit: MAX_BYTES,
      });
    }
    const { error: upErr } = await admin.storage
      .from("attachments")
      .upload(key, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { error: `Could not upload the RAMS: ${upErr.message}` };
  } else {
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from("attachments")
      .upload(key, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { error: `Could not upload the RAMS: ${upErr.message}` };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("project")
    .update({ rams_file_path: key })
    .eq("id", projectId);
  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to update this project." };
    return { error: `Could not save the RAMS: ${error.message}` };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** AI-scan the project's uploaded RAMS into a structured summary. Office only. */
export async function scanRamsAction(projectId: string) {
  if (!AI_ENABLED) return { error: "AI scanning is not enabled on this account." };
  const ctx = await getMyContext();
  if (!isOfficeRole(ctx.profile?.app_role)) {
    return { error: "Only the office can scan RAMS." };
  }

  const project = await getProjectById(projectId);
  if (!project?.rams_file_path) return { error: "Upload a RAMS file first." };

  if (!ADMIN_ENABLED) {
    return { error: "Scanning needs the service role key configured." };
  }
  const admin = createAdminClient();
  const { data: blob, error: dlErr } = await admin.storage
    .from("attachments")
    .download(project.rams_file_path);
  if (dlErr || !blob) return { error: "Could not read the stored RAMS file." };

  const mediaType = blob.type || "application/pdf";
  if (!isScannable(mediaType)) return { error: "This file type can't be scanned." };

  try {
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const scanned = await scanRams(base64, mediaType);
    const summary = formatRamsSummary(scanned);

    const supabase = createClient();
    const { error } = await supabase
      .from("project")
      .update({ rams_summary: summary })
      .eq("id", projectId);
    if (error) return { error: `Scanned, but couldn't save: ${error.message}` };

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, summary };
  } catch (err) {
    return { error: `Couldn't scan the RAMS — ${aiErrorReason(err)}.` };
  }
}
