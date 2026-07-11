import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProjectById,
  getClient,
  getStaff,
  getRegisterForDate,
  staffNameMap,
} from "@/lib/data";
import { SiteRegister, type RegisterRow, type AvailableStaff } from "@/components/SiteRegister";
import { PhaseStub } from "@/components/PageStub";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_PILL,
  CLASSIFICATION_LABEL,
  STAFF_ROLE_SHORT,
} from "@/lib/roles";
import { formatDate, gbp, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  if (!project) notFound();

  const today = todayISO();
  const [staff, register, client] = await Promise.all([
    getStaff(),
    getRegisterForDate(project.id, today),
    project.client_id ? getClient(project.client_id) : Promise.resolve(null),
  ]);

  const names = staffNameMap(staff);
  const byId = new Map(staff.map((s) => [s.id, s]));

  const rows: RegisterRow[] = register.map((e) => {
    const s = byId.get(e.staff_id);
    return {
      id: e.id,
      staffId: e.staff_id,
      name: s?.name ?? "Unknown",
      roleShort: s ? STAFF_ROLE_SHORT[s.role] : "",
      blocked: e.blocked,
      blockReason: e.block_reason,
      checkIn: e.check_in,
      checkOut: e.check_out,
    };
  });

  const onRegister = new Set(register.map((e) => e.staff_id));
  const available: AvailableStaff[] = staff
    .filter((s) => !onRegister.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, roleShort: STAFF_ROLE_SHORT[s.role] }));

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-start gap-2">
        <Link href="/projects" className="mt-1 text-navy-500" aria-label="Back to projects">
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-ink">{project.address}</h1>
            <span className={`pill ${PROJECT_STATUS_PILL[project.status]} shrink-0`}>
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            {project.reference} · {CLASSIFICATION_LABEL[project.classification]}
          </p>
        </div>
      </div>

      {/* Project meta */}
      <section className="card mb-4 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Meta label="Client" value={client?.name} />
          <Meta label="Contract value" value={gbp(project.contract_value)} />
          <Meta
            label="Contracts manager"
            value={project.contracts_manager_id ? names.get(project.contracts_manager_id) : undefined}
          />
          <Meta
            label="Supervisor"
            value={project.supervisor_id ? names.get(project.supervisor_id) : undefined}
          />
          <Meta label="Start" value={formatDate(project.start_date)} />
          <Meta label="End" value={formatDate(project.end_date)} />
          {project.classification === "licensed" && (
            <Meta label="ASB5 notified" value={formatDate(project.asb5_notification_date)} />
          )}
        </dl>
        {project.classification === "licensed" && (
          <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">
            Licensed project — daily start-of-project plant checks (DCU / vacuum /
            NPU) are enforced from Phase D.
          </p>
        )}
      </section>

      {/* Site register with cert-blocking */}
      <SiteRegister projectId={project.id} rows={rows} available={available} />

      {/* Phase D placeholders */}
      <div className="mt-4 space-y-4 opacity-90">
        <PhaseStub title="RPE Daily Checks" phase="Phase D" note="Daily RPE checks, linked to each operative and their mask, arrive in Phase D." />
        <PhaseStub title="Plant & Equipment" phase="Phase D" note="Daily plant checks and the Licensed-project gate arrive in Phase D." />
      </div>
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
