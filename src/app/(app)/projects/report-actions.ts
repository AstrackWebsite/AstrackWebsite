"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { getMyContext } from "@/lib/data";
import { isOfficeRole } from "@/lib/types";
import { buildCloseoutPack } from "@/lib/pdf/buildCloseoutPack";
import {
  ALL_SECTION_KEYS,
  type ReportSectionKey,
} from "@/lib/closeoutSections";

const MAX_BYTES = 25 * 1024 * 1024;
const KEY_SET = new Set<string>(ALL_SECTION_KEYS);

async function uploadPdf(path: string, bytes: Uint8Array) {
  const body = Buffer.from(bytes);
  if (ADMIN_ENABLED) {
    const admin = createAdminClient();
    const { data: bucket } = await admin.storage.getBucket("attachments");
    if (!bucket) {
      await admin.storage.createBucket("attachments", {
        public: false,
        fileSizeLimit: MAX_BYTES,
      });
    }
    return admin.storage
      .from("attachments")
      .upload(path, body, { contentType: "application/pdf", upsert: false });
  }
  const supabase = createClient();
  return supabase.storage
    .from("attachments")
    .upload(path, body, { contentType: "application/pdf", upsert: false });
}

/**
 * Office approval step: generate two report PDFs for the project and file both
 * against it — the full internal copy (office) and a client-facing copy limited
 * to the sections the office chose to share. Both are saved to the project file;
 * nothing is emailed. Office/management only.
 */
export async function generateAndSaveReports(
  projectId: string,
  formData: FormData
) {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company) return { error: "Please sign in again." };
  if (!isOfficeRole(ctx.profile?.app_role)) {
    return { error: "Only the office can approve and file reports." };
  }

  // Sections the office is sharing with the client.
  const clientSections = formData
    .getAll("section")
    .map((v) => String(v))
    .filter((v): v is ReportSectionKey => KEY_SET.has(v));
  if (clientSections.length === 0) {
    return { error: "Choose at least one section for the client copy." };
  }
  // Preserve the canonical section order.
  const orderedClient = ALL_SECTION_KEYS.filter((k) => clientSections.includes(k));

  const office = await buildCloseoutPack(projectId, {
    sections: ALL_SECTION_KEYS,
    audienceNote: "Office copy — full record",
  });
  if (!office) return { error: "Project not found." };

  const client = await buildCloseoutPack(projectId, {
    sections: orderedClient,
    audienceNote: "Client copy",
  });
  if (!client) return { error: "Project not found." };

  const base = `${ctx.company.id}/reports/${projectId}`;
  const officePath = `${base}/office-${crypto.randomUUID()}.pdf`;
  const clientPath = `${base}/client-${crypto.randomUUID()}.pdf`;

  const upOffice = await uploadPdf(officePath, office.bytes);
  if (upOffice.error) return { error: `Could not save the office copy: ${upOffice.error.message}` };
  const upClient = await uploadPdf(clientPath, client.bytes);
  if (upClient.error) return { error: `Could not save the client copy: ${upClient.error.message}` };

  const supabase = createClient();
  const { error } = await supabase.from("project_report").insert([
    {
      project_id: projectId,
      audience: "office",
      sections: ALL_SECTION_KEYS,
      title: "Office copy — full record",
      file_path: officePath,
      generated_by: ctx.profile?.id ?? null,
    },
    {
      project_id: projectId,
      audience: "client",
      sections: orderedClient,
      title: "Client copy",
      file_path: clientPath,
      generated_by: ctx.profile?.id ?? null,
    },
  ]);
  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to file reports." };
    return { error: `Could not record the reports: ${error.message}` };
  }

  revalidatePath(`/projects/${projectId}/closeout`);
  return { ok: true };
}
