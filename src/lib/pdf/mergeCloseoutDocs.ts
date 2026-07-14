import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { createAdminClient, ADMIN_ENABLED } from "@/lib/supabase/admin";
import { CLOSEOUT_DOC_LABEL } from "@/lib/closeoutDocs";
import type { CloseoutDocument } from "@/lib/types";

const A4: [number, number] = [595.28, 841.89];
const NAVY = rgb(0.1, 0.227, 0.361);
const MUTED = rgb(0.357, 0.42, 0.49);

function extType(path: string): "pdf" | "jpg" | "png" | "other" {
  const p = path.toLowerCase();
  if (p.endsWith(".pdf")) return "pdf";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "jpg";
  if (p.endsWith(".png")) return "png";
  return "other";
}

function header(page: PDFPage, bold: PDFFont, font: PDFFont, label: string, title: string | null) {
  page.drawText(label, { x: 40, y: A4[1] - 55, size: 16, font: bold, color: NAVY });
  if (title) page.drawText(title, { x: 40, y: A4[1] - 74, size: 10, font, color: MUTED });
  page.drawLine({
    start: { x: 40, y: A4[1] - 84 },
    end: { x: A4[0] - 40, y: A4[1] - 84 },
    thickness: 1,
    color: NAVY,
  });
}

/**
 * Append every attached handover document to the closeout pack so the client
 * gets one complete file: image certificates are embedded as pages, and PDF
 * certificates have their pages copied in behind a titled divider. Downloads
 * the private files via the service-role client. Best-effort — a document that
 * can't be read is skipped rather than breaking the whole pack.
 */
export async function mergeCloseoutDocs(
  base: Uint8Array,
  docs: CloseoutDocument[]
): Promise<Uint8Array> {
  if (!ADMIN_ENABLED || docs.length === 0) return base;

  let merged: PDFDocument;
  try {
    merged = await PDFDocument.load(base);
  } catch {
    return base;
  }

  const admin = createAdminClient();
  const font = await merged.embedFont(StandardFonts.Helvetica);
  const bold = await merged.embedFont(StandardFonts.HelveticaBold);

  for (const d of docs) {
    const label = CLOSEOUT_DOC_LABEL[d.doc_type] ?? "Handover document";

    let bytes: Uint8Array | null = null;
    try {
      const { data } = await admin.storage.from("attachments").download(d.file_path);
      if (data) bytes = new Uint8Array(await data.arrayBuffer());
    } catch {
      bytes = null;
    }
    if (!bytes) continue;

    try {
      const kind = extType(d.file_path);
      if (kind === "pdf") {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const divider = merged.addPage(A4);
        header(divider, bold, font, label, d.title);
        divider.drawText("Document follows.", { x: 40, y: A4[1] - 110, size: 10, font, color: MUTED });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } else if (kind === "jpg" || kind === "png") {
        const img = kind === "jpg" ? await merged.embedJpg(bytes) : await merged.embedPng(bytes);
        const page = merged.addPage(A4);
        header(page, bold, font, label, d.title);
        const margin = 40;
        const topY = A4[1] - 100;
        const maxW = A4[0] - margin * 2;
        const maxH = topY - margin;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: (A4[0] - w) / 2, y: topY - h, width: w, height: h });
      } else {
        const page = merged.addPage(A4);
        header(page, bold, font, label, d.title);
        page.drawText("Attached to the job (this format can't be embedded here).", {
          x: 40,
          y: A4[1] - 110,
          size: 11,
          font,
          color: MUTED,
        });
      }
    } catch {
      continue; // skip a document that won't parse
    }
  }

  return await merged.save();
}
