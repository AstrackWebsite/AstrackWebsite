import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { KpiTile } from "@/components/KpiTile";
import { getIncidents, getProjects, getAllPlant } from "@/lib/data";
import {
  INCIDENT_TYPE_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_PILL,
} from "@/lib/roles";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const [incidents, projects, plant] = await Promise.all([
    getIncidents(),
    getProjects(),
    getAllPlant(),
  ]);
  const projectAddr = new Map(projects.map((p) => [p.id, p.address]));
  const plantAsset = new Map(plant.map((p) => [p.id, p.asset_id]));

  const open = incidents.filter((i) => i.status !== "closed").length;
  const riddor = incidents.filter((i) => i.riddor_reportable).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageHeader title="Accident & Incident" />
        <Link href="/incidents/new" className="btn-primary px-4 py-2 text-sm">
          + Report
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <KpiTile value={incidents.length} label="Total" />
        <KpiTile value={open} label="Open" tone={open > 0 ? "danger" : "default"} />
        <KpiTile value={riddor} label="RIDDOR" tone={riddor > 0 ? "danger" : "default"} />
      </div>

      <div className="space-y-2">
        {incidents.length === 0 && (
          <p className="card p-4 text-sm text-ink-muted">
            No incidents reported. Tap “Report” to log an accident, near-miss or fault.
          </p>
        )}
        {incidents.map((i) => (
          <Link key={i.id} href={`/incidents/${i.id}`} className="card block p-4 active:bg-surface-muted">
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-ink">{i.title}</span>
              <span className={`pill ${INCIDENT_STATUS_PILL[i.status]} shrink-0`}>
                {INCIDENT_STATUS_LABEL[i.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {INCIDENT_TYPE_LABEL[i.type]}
              {i.project_id && ` · ${projectAddr.get(i.project_id) ?? ""}`}
              {i.plant_id && ` · ${plantAsset.get(i.plant_id) ?? ""}`}
              {` · ${formatDate(i.occurred_at)}`}
            </p>
            {i.riddor_reportable && (
              <span className="pill pill-danger mt-2">RIDDOR reportable</span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
