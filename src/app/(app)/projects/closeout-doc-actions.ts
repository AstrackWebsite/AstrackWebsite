"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { getMyContext } from "@/lib/data";
import { isOfficeRole } from "@/lib/types";
import { CLOSEOUT_DOC_TYPES } from "@/lib/closeoutDocs";

const MAX_BYTES = 15 * 1024 * 1024;
const DOC_TYPE_SET = new Set<string>(CLOSEOUT_DOC_TYPES);
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** Attach a handover document (clearance cert, reoccupation cert, waste note…) to a project. */
export async function uploadCloseoutDocument(projectId: string, formData: FormData) {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company || !isOfficeRole(ctx.profile?.app_role)) {
    return { error: "Office access required." };
  }

  const docType = String(formData.get("doc_type") ?? "other");
  const type = DOC_TYPE_SET.has(docType) ? docType : "other";
  const title = String(formData.get("title") ?? "").trim() || null;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a document to attach." };
  }
  if (file.size > MAX_BYTES) return { error: "Keep the file under 15MB." };
  if (file.type && !ALLOWED.has(file.type)) return { error: "Attach a PDF or an image." };

  const supabase = createClient();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${ctx.company.id}/handover/${projectId}/${crypto.randomUUID()}-${safe}`;

  if (ADMIN_ENABLED) {
    const admin = createAdminClient();
    const { data: bucket } = await admin.storage.getBucket("attachments");
    if (!bucket) {
      await admin.storage.createBucket("attachments", { public: false, fileSizeLimit: MAX_BYTES });
    }
    const { error: upErr } = await admin.storage
      .from("attachments")
      .upload(key, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { error: `Could not upload the document: ${upErr.message}` };
  } else {
    const { error: upErr } = await supabase.storage
      .from("attachments")
      .upload(key, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { error: `Could not upload the document: ${upErr.message}` };
  }

  const { error } = await supabase.from("closeout_document").insert({
    project_id: projectId,
    doc_type: type,
    title,
    file_path: key,
  });
  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to attach documents." };
    return { error: `Could not save the document: ${error.message}` };
  }

  revalidatePath(`/projects/${projectId}/closeout`);
  return { ok: true };
}

/** Remove a handover document from a project. */
export async function deleteCloseoutDocument(id: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("closeout_document").delete().eq("id", id);
  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to remove documents." };
    return { error: `Could not remove the document: ${error.message}` };
  }
  revalidatePath(`/projects/${projectId}/closeout`);
  return { ok: true };
}
