import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  getProjectById,
  getClient,
  getStaff,
  getRegisterForProject,
  getExposureForProject,
  getAllPlant,
  getPlantChecks,
  getAirMonitoringForProject,
  getCloseout,
  getCloseoutDocuments,
  getMyContext,
  staffNameMap,
} from "@/lib/data";
import { CLOSEOUT_DOC_LABEL } from "@/lib/closeoutDocs";
import { CloseoutPack, type CloseoutData } from "@/lib/pdf/CloseoutPack";
import {
  CLASSIFICATION_LABEL,
  PROJECT_STATUS_LABEL,
  AIR_MONITORING_TYPE_LABEL,
} from "@/lib/roles";
import { formatDate, formatTime, gbp } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const project = await getProjectById(params.id);
  if (!project) return new Response("Not found", { status: 404 });

  const [ctx, staff, client, register, exposure, plant, checks, air, closeout, handoverDocs] =
    await Promise.all([
      getMyContext(),
      getStaff(),
      project.client_id ? getClient(project.client_id) : Promise.resolve(null),
      getRegisterForProject(project.id),
      getExposureForProject(project.id),
      getAllPlant(),
      getPlantChecks(project.id),
      getAirMonitoringForProject(project.id),
      getCloseout(project.id),
      getCloseoutDocuments(project.id),
    ]);

  const names = staffNameMap(staff);
  const assetById = new Map(plant.map((p) => [p.id, p.asset_id]));

  // Report title reflects where the project is: an interim compliance report
  // during works, the full closeout pack once completed.
  const completed = project.status === "completed" || Boolean(closeout?.completed_at);
  const reportKind = completed ? "Project Closeout Pack" : "Site Compliance Report";

  const data: CloseoutData = {
    companyName: ctx.company?.name ?? "Compliance Report",
    reportKind,
    generatedAt: formatDate(new Date().toISOString().slice(0, 10)),
    project: {
      reference: project.reference,
      address: project.address,
      classification: CLASSIFICATION_LABEL[project.classification],
      status: PROJECT_STATUS_LABEL[project.status],
      start: formatDate(project.start_date),
      end: formatDate(project.end_date),
      asb5: project.asb5_notification_date ? formatDate(project.asb5_notification_date) : null,
      contractValue: gbp(project.contract_value),
      cm: (project.contracts_manager_id && names.get(project.contracts_manager_id)) || "—",
      supervisor: (project.supervisor_id && names.get(project.supervisor_id)) || "—",
    },
    client: client
      ? { name: client.name, contact: client.contact ?? "—", email: client.email ?? "—" }
      : null,
    handover: [
      { label: "Plan of work delivered", done: Boolean(closeout?.plan_of_work_delivered) },
      { label: "Air monitoring complete", done: Boolean(closeout?.air_monitoring_complete) },
      { label: "4-stage clearance commenced", done: Boolean(closeout?.four_stage_clearance_commenced) },
      { label: "Certificate of reoccupation received", done: Boolean(closeout?.cert_reoccupation_received) },
    ],
    handoverDocs: handoverDocs.map((d) => ({
      type: CLOSEOUT_DOC_LABEL[d.doc_type] ?? "Document",
      title: d.title,
    })),
    register: register.map((r) => ({
      name: names.get(r.staff_id) ?? "Unknown",
      date: formatDate(r.entry_date),
      inOut: r.blocked
        ? "—"
        : `${formatTime(r.check_in)}${r.check_out ? " – " + formatTime(r.check_out) : ""}`,
      status: r.blocked ? `BLOCKED: ${r.block_reason ?? ""}` : r.check_out ? "Signed out" : "On site",
    })),
    exposure: exposure.map((e) => ({
      name: names.get(e.staff_id) ?? "Unknown",
      date: formatDate(e.entry_date),
      task: e.task ?? "—",
      detail: `${e.hours_exposure}h · ${e.fibre_level} f/ml${e.mask_worn ? " · " + e.mask_worn : ""}`,
      twa: `${e.twa_4h.toFixed(3)} f/ml`,
    })),
    plantChecks: checks.map((c) => ({
      asset: assetById.get(c.plant_id) ?? "—",
      date: formatDate(c.check_date),
      kind: c.is_start_of_project ? "Start-of-project" : "Daily",
    })),
    air: air.map((a) => ({
      type: AIR_MONITORING_TYPE_LABEL[a.type],
      result: a.result_fml != null ? `${a.result_fml} f/ml` : "—",
      status: a.pass === true ? "Pass" : a.pass === false ? "Fail" : "Pending",
      date: formatDate(a.sampled_on),
    })),
    rating: closeout?.client_rating ? "★".repeat(closeout.client_rating) : "Not rated",
    comments: closeout?.client_comments ?? "",
  };

  // CloseoutPack wraps a <Document>; cast for renderToBuffer's element type.
  const element = createElement(CloseoutPack, { data }) as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(element);

  const slug = completed ? "closeout" : "report";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-${project.reference}.pdf"`,
    },
  });
}
