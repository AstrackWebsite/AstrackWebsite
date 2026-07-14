"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { getMyContext } from "@/lib/data";
import { isOfficeRole } from "@/lib/types";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { scanCertificate, isScannable, CERT_FIELDS } from "@/lib/ai/certScan";
import { CERT_FIELD_LABEL } from "@/lib/certFields";

const CERT_FIELD_SET = new Set<string>(CERT_FIELDS);
const MAX_BYTES = 15 * 1024 * 1024;

interface ScannedRowLite {
  field: string | null;
  title: string;
  expiryDate: string | null;
  issueDate: string | null;
}

export interface FiledCert {
  field: string | null;
  label: string;
  expiry: string | null;
}

export type ScanFileState =
  | Record<string, never>
  | { ok: true; matched: true; staffName: string; filed: FiledCert[] }
  | {
      ok: true;
      matched: false;
      holderName: string | null;
      filePath: string;
      rows: ScannedRowLite[];
    }
  | { ok: false; error: string };

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Upload a file to the private attachments bucket, returning its storage key. */
async function uploadToAttachments(companyId: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const key = `${companyId}/staff-certs/${crypto.randomUUID()}-${safe}`;
  const admin = createAdminClient();
  const { data: bucket } = await admin.storage.getBucket("attachments");
  if (!bucket) {
    await admin.storage.createBucket("attachments", { public: false, fileSizeLimit: MAX_BYTES });
  }
  const { error } = await admin.storage
    .from("attachments")
    .upload(key, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return key;
}

/**
 * Insert a certificate row per scanned cert and refresh the matching staff
 * expiry column. Uses the user client so RLS enforces management + tenant.
 */
async function fileRows(
  staffId: string,
  filePath: string,
  rows: ScannedRowLite[]
): Promise<FiledCert[]> {
  const supabase = createClient();
  const filed: FiledCert[] = [];
  for (const r of rows) {
    const field = r.field && CERT_FIELD_SET.has(r.field) ? r.field : null;
    await supabase.from("staff_certificate").insert({
      staff_id: staffId,
      cert_field: field,
      title: r.title || null,
      file_path: filePath,
      expiry_date: r.expiryDate,
      issue_date: r.issueDate,
    });
    // Keep the staff record's date column in step with the freshest evidence.
    if (field && r.expiryDate) {
      await supabase.from("staff").update({ [field]: r.expiryDate }).eq("id", staffId);
    }
    filed.push({
      field,
      label: field ? CERT_FIELD_LABEL[field] ?? "Certificate" : "Certificate",
      expiry: r.expiryDate,
    });
  }
  return filed;
}

/**
 * Scan a certificate photo/PDF, then file it automatically to the staff member
 * whose name matches the one printed on it — updating their expiry dates and
 * keeping the document as evidence. If no single match is found, the file is
 * kept and the caller is asked to pick the person.
 */
export async function scanAndFileCertificate(
  _prev: ScanFileState,
  formData: FormData
): Promise<ScanFileState> {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company || !isOfficeRole(ctx.profile?.app_role)) {
    return { ok: false, error: "Office access required." };
  }
  if (!AI_ENABLED) return { ok: false, error: "AI scanning is not enabled on this account." };
  if (!ADMIN_ENABLED) return { ok: false, error: "Certificate storage isn't configured." };

  const file = formData.get("certificate");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo or PDF of the certificate." };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "Keep the file under 15MB." };
  if (!isScannable(file.type)) return { ok: false, error: "Upload a JPG, PNG or PDF." };

  // Scan first (so we don't store an unreadable file), then upload.
  let holderName: string | null;
  let rows: ScannedRowLite[];
  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await scanCertificate(base64, file.type);
    holderName = result.holderName;
    rows = result.rows.map((r) => ({
      field: r.field === "unknown" ? null : r.field,
      title: r.title,
      expiryDate: r.expiryDate,
      issueDate: r.issueDate,
    }));
  } catch (err) {
    return { ok: false, error: `Couldn't read that certificate — ${aiErrorReason(err)}.` };
  }

  let filePath: string;
  try {
    filePath = await uploadToAttachments(ctx.company.id, file);
  } catch (e) {
    return { ok: false, error: `Could not store the certificate: ${(e as Error).message}` };
  }

  // Match the printed holder name against this company's staff.
  const supabase = createClient();
  const { data: staffList } = await supabase.from("staff").select("id, name");
  const staff = (staffList as { id: string; name: string }[]) ?? [];

  let matches: { id: string; name: string }[] = [];
  if (holderName) {
    const target = norm(holderName);
    matches = staff.filter((s) => norm(s.name) === target);
    if (matches.length === 0) {
      matches = staff.filter(
        (s) => norm(s.name).includes(target) || target.includes(norm(s.name))
      );
    }
  }

  if (matches.length === 1) {
    const filed = await fileRows(matches[0].id, filePath, rows);
    revalidatePath("/staff");
    revalidatePath(`/staff/${matches[0].id}`);
    return { ok: true, matched: true, staffName: matches[0].name, filed };
  }

  // No confident match — hand back the scan so the office can pick the person.
  return { ok: true, matched: false, holderName, filePath, rows };
}

/** Confirm-file a already-scanned certificate to a chosen staff member. */
export async function fileScannedCertificate(
  _prev: ScanFileState,
  formData: FormData
): Promise<ScanFileState> {
  const ctx = await getMyContext();
  if (!ctx.user || !ctx.company || !isOfficeRole(ctx.profile?.app_role)) {
    return { ok: false, error: "Office access required." };
  }
  const staffId = String(formData.get("staff_id") ?? "").trim();
  const filePath = String(formData.get("file_path") ?? "").trim();
  if (!staffId) return { ok: false, error: "Choose a staff member." };
  if (!filePath) return { ok: false, error: "Missing the scanned file." };

  let rows: ScannedRowLite[] = [];
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { ok: false, error: "Could not read the scan result. Try again." };
  }

  const { data: s } = await createClient().from("staff").select("name").eq("id", staffId).single();
  const filed = await fileRows(staffId, filePath, rows);
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
  return { ok: true, matched: true, staffName: (s as { name: string })?.name ?? "Staff", filed };
}
