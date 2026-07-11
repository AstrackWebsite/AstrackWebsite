import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProjectById,
  getClient,
  getStaff,
  getRegisterForDate,
  getExposureForProject,
  getProjectPlant,
  getPlantChecks,
  staffNameMap,
} from "@/lib/data";
import { SiteRegister, type RegisterRow, type AvailableStaff } from "@/components/SiteRegister";
import { ExposureCapture, type ExposureRow, type Operative } from "@/components/ExposureCapture";
import { PlantChecks, type PlantRow, type PlantGate } from "@/components/PlantChecks";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_PILL,
  CLASSIFICATION_LABEL,
  STAFF_ROLE_SHORT,
  GATED_PLANT_TYPES,
} from "@/lib/roles";
import { isExpired, isExpiringSoon } from "@/lib/compliance";
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
  const [staff, register, client, exposure, plant, plantChecks] = await Promise.all([
    getStaff(),
    getRegisterForDate(project.id, today),
    project.client_id ? getClient(project.client_id) : Promise.resolve(null),
    getExposureForProject(project.id),
    getProjectPlant(project.id),
    getPlantChecks(project.id),
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

  // Exposure — operatives on site today (checked in, not blocked) can be logged.
  const operatives: Operative[] = register
    .filter((e) => e.check_in && !e.blocked)
    .map((e) => ({ id: e.staff_id, name: byId.get(e.staff_id)?.name ?? "Unknown" }));
  const exposureRows: ExposureRow[] = exposure.map((e) => ({
    id: e.id,
    staffId: e.staff_id,
    name: byId.get(e.staff_id)?.name ?? "Unknown",
    entryDate: e.entry_date,
    task: e.task,
    asbestos: e.asbestos_type,
    mask: e.mask_worn,
    hours: e.hours_exposure,
    fibre: e.fibre_level,
    twa: e.twa_4h,
  }));

  // Plant checks + licensed gate (Rule 5).
  const checkedTodayIds = new Set(
    plantChecks.filter((c) => c.check_date === today).map((c) => c.plant_id)
  );
  const startedIds = new Set(
    plantChecks.filter((c) => c.is_start_of_project).map((c) => c.plant_id)
  );
  const plantRows: PlantRow[] = plant.map((p) => ({
    id: p.id,
    assetId: p.asset_id,
    name: p.name,
    type: p.type,
    certExpiry: p.cert_expiry,
    certExpired: isExpired(p.cert_expiry),
    certExpiring: isExpiringSoon(p.cert_expiry),
    gated: GATED_PLANT_TYPES.includes(p.type),
    checkedToday: checkedTodayIds.has(p.id),
  }));
  const gatedPlant = plant.filter((p) => GATED_PLANT_TYPES.includes(p.type));
  const gate: PlantGate = {
    licensed: project.classification === "licensed",
    requiredCount: gatedPlant.length,
    startComplete: gatedPlant.every((p) => startedIds.has(p.id)),
    todayComplete: gatedPlant.every((p) => checkedTodayIds.has(p.id)),
  };

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
      <div className="space-y-4">
        <SiteRegister projectId={project.id} rows={rows} available={available} />
        <PlantChecks projectId={project.id} plant={plantRows} gate={gate} />
        <ExposureCapture
          projectId={project.id}
          operatives={operatives}
          records={exposureRows}
        />
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
