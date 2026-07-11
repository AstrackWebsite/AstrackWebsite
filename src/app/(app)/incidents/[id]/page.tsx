import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getIncident,
  getMyContext,
  getProjectById,
  getStaffMember,
  getAllPlant,
} from "@/lib/data";
import { InvestigationForm } from "@/components/InvestigationForm";
import {
  INCIDENT_TYPE_LABEL,
  INCIDENT_STATUS_LABEL,
  INCIDENT_STATUS_PILL,
  INCIDENT_SEVERITY_LABEL,
} from "@/lib/roles";
import { formatDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const incident = await getIncident(params.id);
  if (!incident) notFound();

  const [ctx, project, reporter, plant] = await Promise.all([
    getMyContext(),
    incident.project_id ? getProjectById(incident.project_id) : Promise.resolve(null),
    incident.reported_by_staff_id
      ? getStaffMember(incident.reported_by_staff_id)
      : Promise.resolve(null),
    getAllPlant(),
  ]);
  const asset = incident.plant_id
    ? plant.find((p) => p.id === incident.plant_id)
    : null;
  const isManagement =
    ctx.profile?.app_role === "admin" || ctx.profile?.app_role === "management";

  return (
    <>
      <div className="mb-4 flex items-start gap-2">
        <Link href="/incidents" className="mt-1 text-navy-500" aria-label="Back">‹</Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-ink">{incident.title}</h1>
            <span className={`pill ${INCIDENT_STATUS_PILL[incident.status]} shrink-0`}>
              {INCIDENT_STATUS_LABEL[incident.status]}
            </span>
          </div>
          <p className="text-sm text-ink-muted">{INCIDENT_TYPE_LABEL[incident.type]}</p>
        </div>
      </div>

      {incident.riddor_reportable && (
        <div className="mb-4 rounded-card border border-danger-200 bg-danger-50 p-4">
          <p className="font-semibold text-danger-700">RIDDOR reportable</p>
          <p className="text-sm text-danger-600">
            This event must be reported to the HSE within the required timeframe.
          </p>
        </div>
      )}

      <section className="card mb-4 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Meta label="When" value={`${formatDate(incident.occurred_at)} · ${formatTime(incident.occurred_at)}`} />
          <Meta label="Severity" value={incident.severity ? INCIDENT_SEVERITY_LABEL[incident.severity] : "—"} />
          <Meta label="Location" value={incident.location} />
          <Meta label="Project" value={project?.address} />
          {asset && <Meta label="Equipment" value={`${asset.asset_id}`} />}
          <Meta label="Reported by" value={reporter?.name} />
        </dl>
        {incident.description && (
          <div className="mt-3 border-t border-surface-border pt-3">
            <dt className="text-xs uppercase tracking-wide text-ink-faint">What happened</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">{incident.description}</dd>
          </div>
        )}
      </section>

      {isManagement ? (
        <InvestigationForm
          incidentId={incident.id}
          status={incident.status}
          outcome={incident.investigation_outcome}
        />
      ) : (
        incident.investigation_outcome && (
          <section className="card p-4">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Investigation outcome
            </h2>
            <p className="whitespace-pre-wrap text-sm text-ink">{incident.investigation_outcome}</p>
          </section>
        )
      )}
    </>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-ink">{value || "—"}</dd>
    </div>
  );
}
