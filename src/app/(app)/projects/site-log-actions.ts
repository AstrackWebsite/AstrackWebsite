"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { getMyContext } from "@/lib/data";
import { notifyOffice } from "@/lib/notify";
import { todayISO } from "@/lib/format";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** Add an entry to the project's daily site log (diary), with an optional photo/PDF. */
export async function addSiteLog(projectId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Write a short note for the log." };
  const category = String(formData.get("category") ?? "").trim() || null;
  const author = String(formData.get("author_staff_id") ?? "").trim() || null;

  const supabase = createClient();

  // Optional attachment (site photo from camera/gallery, or a PDF).
  let attachmentPath: string | null = null;
  let attachmentType: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) return { error: "Attachment must be under 15MB." };
    if (file.type && !ATTACHMENT_TYPES.has(file.type))
      return { error: "Attach a photo (JPG/PNG) or a PDF." };

    const ctx = await getMyContext();
    if (!ctx.company) return { error: "Please sign in again." };

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const key = `${ctx.company.id}/${projectId}/${crypto.randomUUID()}-${safe}`;

    if (ADMIN_ENABLED) {
      const admin = createAdminClient();
      const { data: bucket } = await admin.storage.getBucket("attachments");
      if (!bucket) {
        await admin.storage.createBucket("attachments", {
          public: false,
          fileSizeLimit: MAX_ATTACHMENT_BYTES,
        });
      }
      const { error: upErr } = await admin.storage
        .from("attachments")
        .upload(key, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) return { error: `Could not upload the attachment: ${upErr.message}` };
    } else {
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(key, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) return { error: `Could not upload the attachment: ${upErr.message}` };
    }
    attachmentPath = key;
    attachmentType = file.type || null;
  }

  const { error } = await supabase.from("site_log").insert({
    project_id: projectId,
    log_date: todayISO(),
    category,
    note,
    author_staff_id: author,
    attachment_path: attachmentPath,
    attachment_type: attachmentType,
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to add to the log." };
    return { error: `Could not save the log entry: ${error.message}` };
  }
  await notifyOffice({ projectId, kind: "site_log", message: "added a site diary entry" });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Sign a visitor onto site (records the time in). */
export async function addVisitor(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter the visitor's name." };
  const organisation = String(formData.get("organisation") ?? "").trim() || null;
  const purpose = String(formData.get("purpose") ?? "").trim() || null;

  const supabase = createClient();
  const { error } = await supabase.from("site_visitor").insert({
    project_id: projectId,
    visit_date: todayISO(),
    name,
    organisation,
    purpose,
    time_in: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to sign visitors in." };
    return { error: "Could not sign the visitor in. Please try again." };
  }
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Sign a visitor off site (records the time out). */
export async function signOutVisitor(visitorId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("site_visitor")
    .update({ time_out: new Date().toISOString() })
    .eq("id", visitorId);
  if (error) return { error: "Could not sign the visitor out." };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
