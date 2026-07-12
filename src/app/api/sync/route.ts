import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AsbestosType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Replays queued offline saves. The client posts the items it stored while
// offline; each is applied under the caller's session (RLS + company stamping
// apply exactly as for an online save). Per-item results tell the client which
// to clear from its outbox and which to keep for retry.

const ASBESTOS: AsbestosType[] = ["chrysotile", "amosite", "crocidolite"];

interface InItem {
  id: string;
  kind: string;
  projectId: string;
  payload: Record<string, string | number | null>;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let items: InItem[] = [];
  try {
    const body = await request.json();
    items = Array.isArray(body?.items) ? body.items : [];
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const item of items) {
    try {
      if (item.kind === "exposure") {
        const p = item.payload ?? {};
        const staffId = String(p.staff_id ?? "");
        const fibre = Number(p.fibre_level);
        const hours = Number(p.hours_exposure);
        if (!staffId || !Number.isFinite(fibre) || fibre < 0 || !Number.isFinite(hours) || hours <= 0) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        const asbestos = String(p.asbestos_type ?? "");
        const { error } = await supabase.from("exposure_record").insert({
          project_id: item.projectId,
          staff_id: staffId,
          entry_date: String(p.entry_date ?? new Date().toISOString().slice(0, 10)),
          task: (p.task as string) || null,
          asbestos_type: ASBESTOS.includes(asbestos as AsbestosType) ? asbestos : null,
          shift1_start: (p.shift1_start as string) || null,
          shift1_end: (p.shift1_end as string) || null,
          shift2_start: (p.shift2_start as string) || null,
          shift2_end: (p.shift2_end as string) || null,
          mask_worn: (p.mask_worn as string) || null,
          hours_exposure: hours,
          fibre_level: fibre,
        });
        if (error) {
          results.push({ id: item.id, ok: false, error: "Save rejected." });
        } else {
          results.push({ id: item.id, ok: true });
        }
      } else {
        results.push({ id: item.id, ok: false, error: "Unknown item type." });
      }
    } catch {
      results.push({ id: item.id, ok: false, error: "Sync error." });
    }
  }

  return NextResponse.json({ results });
}
