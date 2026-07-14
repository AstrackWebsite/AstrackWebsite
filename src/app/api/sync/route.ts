import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { staffBlockReason } from "@/lib/compliance";
import type { AsbestosType, Staff } from "@/lib/types";

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
      } else if (item.kind === "signin") {
        const p = item.payload ?? {};
        const staffId = String(p.staff_id ?? "");
        const entryDate = String(p.entry_date ?? new Date().toISOString().slice(0, 10));
        if (!staffId) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        // Recompute the block authoritatively at sync time from the live record.
        const { data: staff } = await supabase
          .from("staff")
          .select("*")
          .eq("id", staffId)
          .single();
        if (!staff) {
          results.push({ id: item.id, ok: false, error: "Staff not found." });
          continue;
        }
        const reason = staffBlockReason(staff as Staff);
        const checkOut = (p.check_out as string) || null;
        let checklist: { label: string; checked: boolean }[] | null = null;
        try {
          checklist = p.checklist ? JSON.parse(String(p.checklist)) : null;
        } catch {
          checklist = null;
        }
        const row: {
          project_id: string;
          staff_id: string;
          entry_date: string;
          blocked?: boolean;
          block_reason?: string;
          check_in?: string;
          check_out?: string;
          checklist?: { label: string; checked: boolean }[] | null;
          rpe?: string | null;
        } = reason
          ? { project_id: item.projectId, staff_id: staffId, entry_date: entryDate, blocked: true, block_reason: reason }
          : {
              project_id: item.projectId,
              staff_id: staffId,
              entry_date: entryDate,
              check_in: (p.check_in as string) || new Date().toISOString(),
              checklist,
              rpe: (p.rpe as string) || null,
              ...(checkOut ? { check_out: checkOut } : {}),
            };
        const { error } = await supabase.from("site_register_entry").insert(row);
        results.push(error ? { id: item.id, ok: false, error: "Save rejected." } : { id: item.id, ok: true });
      } else if (item.kind === "signout") {
        const entryId = String(item.payload?.entry_id ?? "");
        if (!entryId) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        const { error } = await supabase
          .from("site_register_entry")
          .update({ check_out: String(item.payload?.check_out ?? new Date().toISOString()) })
          .eq("id", entryId);
        results.push(error ? { id: item.id, ok: false, error: "Save rejected." } : { id: item.id, ok: true });
      } else if (item.kind === "plant_check") {
        const plantId = String(item.payload?.plant_id ?? "");
        if (!plantId) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        const { count } = await supabase
          .from("plant_daily_check")
          .select("*", { count: "exact", head: true })
          .eq("project_id", item.projectId)
          .eq("plant_id", plantId);
        const { error } = await supabase.from("plant_daily_check").insert({
          project_id: item.projectId,
          plant_id: plantId,
          check_date: String(item.payload?.check_date ?? new Date().toISOString().slice(0, 10)),
          passed: true,
          is_start_of_project: (count ?? 0) === 0,
        });
        // A repeat check for the same day is a harmless no-op, not a failure.
        if (error && !/duplicate|unique/i.test(error.message)) {
          results.push({ id: item.id, ok: false, error: "Save rejected." });
        } else {
          results.push({ id: item.id, ok: true });
        }
      } else if (item.kind === "site_log") {
        const p = item.payload ?? {};
        const note = String(p.note ?? "").trim();
        if (!note) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        const { error } = await supabase.from("site_log").insert({
          project_id: item.projectId,
          log_date: String(p.log_date ?? new Date().toISOString().slice(0, 10)),
          category: (p.category as string) || null,
          note,
          author_staff_id: (p.author_staff_id as string) || null,
        });
        results.push(error ? { id: item.id, ok: false, error: "Save rejected." } : { id: item.id, ok: true });
      } else if (item.kind === "visitor_in") {
        const p = item.payload ?? {};
        const name = String(p.name ?? "").trim();
        if (!name) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        const { error } = await supabase.from("site_visitor").insert({
          project_id: item.projectId,
          visit_date: String(p.visit_date ?? new Date().toISOString().slice(0, 10)),
          name,
          organisation: (p.organisation as string) || null,
          purpose: (p.purpose as string) || null,
          time_in: (p.time_in as string) || new Date().toISOString(),
          time_out: (p.time_out as string) || null,
        });
        results.push(error ? { id: item.id, ok: false, error: "Save rejected." } : { id: item.id, ok: true });
      } else if (item.kind === "visitor_out") {
        const visitorId = String(item.payload?.visitor_id ?? "");
        if (!visitorId) {
          results.push({ id: item.id, ok: false, error: "Invalid record." });
          continue;
        }
        const { error } = await supabase
          .from("site_visitor")
          .update({ time_out: String(item.payload?.time_out ?? new Date().toISOString()) })
          .eq("id", visitorId);
        results.push(error ? { id: item.id, ok: false, error: "Save rejected." } : { id: item.id, ok: true });
      } else {
        results.push({ id: item.id, ok: false, error: "Unknown item type." });
      }
    } catch {
      results.push({ id: item.id, ok: false, error: "Sync error." });
    }
  }

  return NextResponse.json({ results });
}
