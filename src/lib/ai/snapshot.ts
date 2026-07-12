import "server-only";

import {
  getStaff,
  getProjects,
  getAllPlant,
  getIncidents,
  getAudits,
  getAllExposure,
  getClients,
  staffNameMap,
} from "@/lib/data";
import { staffCertStatus, isExpired, isExpiringSoon, CONTROL_LIMIT_FML } from "@/lib/compliance";
import {
  STAFF_ROLE_LABEL,
  PROJECT_STATUS_LABEL,
  CLASSIFICATION_LABEL,
  PLANT_TYPE_LABEL,
  INCIDENT_TYPE_LABEL,
  INCIDENT_STATUS_LABEL,
} from "@/lib/roles";

// Builds a compact, plain-text snapshot of the signed-in company's operational
// data for the copilot to reason over. Everything here is already scoped to the
// caller's company by RLS, so the copilot can only ever see that company's data.

export async function buildCompanySnapshot(): Promise<string> {
  const [staff, projects, plant, incidents, audits, exposure, clients] = await Promise.all([
    getStaff(),
    getProjects(),
    getAllPlant(),
    getIncidents(),
    getAudits(),
    getAllExposure(),
    getClients(),
  ]);

  const names = staffNameMap(staff);
  const projectAddr = new Map(projects.map((p) => [p.id, p.address]));
  const today = new Date();

  const staffLines = staff.map((s) => {
    const st = staffCertStatus(s, today);
    return `- ${s.name} (${STAFF_ROLE_LABEL[s.role]}): ${st.label}${st.date ? ` [${st.date}]` : ""}`;
  });

  const projectLines = projects.map((p) => {
    const cm = p.contracts_manager_id ? names.get(p.contracts_manager_id) : null;
    const sup = p.supervisor_id ? names.get(p.supervisor_id) : null;
    return `- ${p.reference} — ${p.address} · ${CLASSIFICATION_LABEL[p.classification]} · ${PROJECT_STATUS_LABEL[p.status]}${
      p.start_date ? ` · starts ${p.start_date}` : ""
    }${p.end_date ? ` · ends ${p.end_date}` : ""}${cm ? ` · CM ${cm}` : ""}${sup ? ` · Sup ${sup}` : ""}`;
  });

  const plantLines = plant.map((p) => {
    const status = isExpired(p.cert_expiry, today)
      ? "CERT EXPIRED"
      : isExpiringSoon(p.cert_expiry, 30, today)
        ? "cert expiring soon"
        : "in date";
    return `- ${p.asset_id} (${PLANT_TYPE_LABEL[p.type]}): ${status}${p.cert_expiry ? ` [${p.cert_expiry}]` : ""}`;
  });

  const openIncidents = incidents.filter((i) => i.status !== "closed");
  const incidentLines = incidents
    .slice(0, 40)
    .map(
      (i) =>
        `- ${i.occurred_at.slice(0, 10)} ${INCIDENT_TYPE_LABEL[i.type]}: ${i.title} · ${INCIDENT_STATUS_LABEL[i.status]}${
          i.riddor_reportable ? " · RIDDOR" : ""
        }`
    );

  const scored = audits.filter((a) => a.score != null);
  const avgAudit =
    scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length)
      : null;

  const overLimit = exposure.filter((e) => e.twa_4h >= CONTROL_LIMIT_FML);
  const exposureLine =
    exposure.length === 0
      ? "No exposure records."
      : `${exposure.length} exposure records; ${overLimit.length} at/over the control limit (${CONTROL_LIMIT_FML} f/ml).${
          overLimit.length
            ? " Over-limit: " +
              overLimit
                .slice(0, 10)
                .map(
                  (e) =>
                    `${names.get(e.staff_id) ?? "?"} ${e.twa_4h.toFixed(3)} on ${e.entry_date} (${projectAddr.get(e.project_id) ?? "?"})`
                )
                .join("; ")
            : ""
        }`;

  return [
    `TODAY: ${today.toISOString().slice(0, 10)}`,
    `CLIENTS: ${clients.length}`,
    ``,
    `STAFF (${staff.length}):`,
    ...staffLines,
    ``,
    `PROJECTS (${projects.length}):`,
    ...projectLines,
    ``,
    `PLANT & EQUIPMENT (${plant.length}):`,
    ...plantLines,
    ``,
    `INCIDENTS (${incidents.length} total, ${openIncidents.length} open):`,
    ...incidentLines,
    ``,
    `AUDITS: ${audits.length} recorded, average score ${avgAudit == null ? "n/a" : avgAudit + "%"}.`,
    ``,
    `EXPOSURE: ${exposureLine}`,
  ].join("\n");
}
