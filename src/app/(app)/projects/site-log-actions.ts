"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

/** Add an entry to the project's daily site log (diary). */
export async function addSiteLog(projectId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Write a short note for the log." };
  const category = String(formData.get("category") ?? "").trim() || null;
  const author = String(formData.get("author_staff_id") ?? "").trim() || null;

  const supabase = createClient();
  const { error } = await supabase.from("site_log").insert({
    project_id: projectId,
    log_date: todayISO(),
    category,
    note,
    author_staff_id: author,
  });

  if (error) {
    if (error.code === "42501") return { error: "You don't have permission to add to the log." };
    return { error: "Could not save the log entry. Please try again." };
  }
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
