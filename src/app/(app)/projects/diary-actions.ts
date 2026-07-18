"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyOffice } from "@/lib/notify";
import { todayISO } from "@/lib/format";
import { DCU_CHECKS } from "@/lib/diary";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim() || null;
const num = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Weekly RPE inspection (competent-person check of a mask). */
export async function addRpeInspection(projectId: string, formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.from("rpe_inspection").insert({
    project_id: projectId,
    inspection_date: str(formData, "inspection_date") ?? todayISO(),
    employee_name: str(formData, "employee_name"),
    mask_ref: str(formData, "mask_ref"),
    make_model: str(formData, "make_model"),
    passed: formData.get("passed") !== "false",
    comments: str(formData, "comments"),
    inspector_name: str(formData, "inspector_name"),
  });
  if (error) return { error: `Could not save the RPE inspection: ${error.message}` };
  await notifyOffice({ projectId, kind: "rpe", message: "recorded a weekly RPE inspection" });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** HAV (hand-arm vibration) exposure entry. */
export async function addHavExposure(projectId: string, formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.from("hav_exposure").insert({
    project_id: projectId,
    entry_date: str(formData, "entry_date") ?? todayISO(),
    tool: str(formData, "tool"),
    start_time: str(formData, "start_time"),
    finish_time: str(formData, "finish_time"),
    operative1: str(formData, "operative1"),
    duration1: str(formData, "duration1"),
    operative2: str(formData, "operative2"),
    duration2: str(formData, "duration2"),
    vibration_magnitude: num(formData, "vibration_magnitude"),
    eav: str(formData, "eav"),
    elv: str(formData, "elv"),
  });
  if (error) return { error: `Could not save the HAV record: ${error.message}` };
  await notifyOffice({ projectId, kind: "hav", message: "recorded a HAV exposure entry" });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Anemometer reading + face-velocity/volume calculation. */
export async function addAnemometerReading(projectId: string, formData: FormData) {
  const points = [0, 1, 2, 3, 4]
    .map((i) => num(formData, `point_${i}`))
    .map((n) => n ?? 0);
  const capacity = num(formData, "npu_capacity");
  const filterFace = num(formData, "filter_face_m2");
  const avg = points.reduce((s, p) => s + p, 0) / 5;
  const volume =
    filterFace != null ? Number((avg * filterFace * 3600).toFixed(0)) : null;

  const supabase = createClient();
  const { error } = await supabase.from("anemometer_reading").insert({
    project_id: projectId,
    reading_date: str(formData, "reading_date") ?? todayISO(),
    npu_id: str(formData, "npu_id"),
    npu_capacity: capacity,
    points,
    filter_face_m2: filterFace,
    average_velocity: Number(avg.toFixed(3)),
    volume_m3: volume,
  });
  if (error) return { error: `Could not save the reading: ${error.message}` };
  await notifyOffice({ projectId, kind: "anemometer", message: "recorded an anemometer reading" });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** DCU daily inspection (checklist). */
export async function addDcuInspection(projectId: string, formData: FormData) {
  const checks = DCU_CHECKS.map((label, i) => ({
    label,
    checked: formData.get(`check_${i}`) === "on",
  }));
  const supabase = createClient();
  const { error } = await supabase.from("dcu_inspection").insert({
    project_id: projectId,
    inspection_date: str(formData, "inspection_date") ?? todayISO(),
    dcu_id: str(formData, "dcu_id"),
    checks,
    comments: str(formData, "comments"),
  });
  if (error) return { error: `Could not save the DCU inspection: ${error.message}` };
  await notifyOffice({ projectId, kind: "dcu", message: "recorded a DCU inspection" });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

/** Toolbox talk (TBT) record. */
export async function addToolboxTalk(projectId: string, formData: FormData) {
  const topic = str(formData, "topic");
  if (!topic) return { error: "Give the toolbox talk a topic." };
  const supabase = createClient();
  const { error } = await supabase.from("toolbox_talk").insert({
    project_id: projectId,
    talk_date: str(formData, "talk_date") ?? todayISO(),
    topic,
    delivered_by: str(formData, "delivered_by"),
    attendees: str(formData, "attendees"),
    notes: str(formData, "notes"),
  });
  if (error) return { error: `Could not save the toolbox talk: ${error.message}` };
  await notifyOffice({ projectId, kind: "tbt", message: `delivered a toolbox talk: ${topic}` });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
