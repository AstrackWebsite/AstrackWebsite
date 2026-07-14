import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import {
  getProjectById,
  getClient,
  getStaff,
  getRegisterForDate,
  getExposureForProject,
  getProjectPlant,
  getAllPlant,
  getPlantChecks,
  getSiteLog,
  getVisitors,
  getShiftForDate,
  getWorkAreas,
  getProjectStaff,
  getCloseout,
  getMyContext,
  signPlanUrl,
  signAttachmentUrl,
  staffNameMap,
} from "@/lib/data";
import { SiteRegister, type RegisterRow, type AvailableStaff } from "@/components/SiteRegister";
import { ExposureCapture, type ExposureRow, type Operative } from "@/components/ExposureCapture";
import { PlantChecks, type PlantRow, type PlantGate } from "@/components/PlantChecks";
import { SiteDiary, type DiaryEntry } from "@/components/SiteDiary";
import { VisitorLog, type VisitorRow } from "@/components/VisitorLog";
import { ShiftControl } from "@/components/ShiftControl";
import { WorkAreas, type WorkAreaRow } from "@/components/WorkAreas";
import { RamsPanel } from "@/components/RamsPanel";
import { SiteTeam, type TeamMember } from "@/components/SiteTeam";
import { SitePlant, type PlantOption } from "@/components/SitePlant";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { isOfficeRole } from "@/lib/types";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_PILL,
  CLASSIFICATION_LABEL,
  NOTIFICATION_FORM,
  STAFF_ROLE_SHORT,
  GATED_PLANT_TYPES,
  PLANT_TYPE_LABEL,
} from "@/lib/roles";
import { isExpired, isExpiringSoon, staffBlockReason, staffCertEvidence } from "@/lib/compliance";
import { formatDate, gbp, todayISO } from "@/lib/format";
import { AI_ENABLED } from "@/lib/ai/client";
import { RamsDrafter } from "@/components/RamsDrafter";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  if (!project) notFound();

  const today = todayISO();
  const [staff, register, client, exposure, plant, allPlant, plantChecks, siteLog, visitors, shift, workAreas, team, ctx, closeout] =
    await Promise.all([
      getStaff(),
      getRegisterForDate(project.id, today),
      project.client_id ? getClient(project.client_id) : Promise.resolve(null),
      getExposureForProject(project.id),
      getProjectPlant(project.id),
      getAllPlant(),
      getPlantChecks(project.id),
      getSiteLog(project.id),
      getVisitors(project.id),
      getShiftForDate(project.id, today),
      getWorkAreas(project.id),
      getProjectStaff(project.id),
      getMyContext(),
      getCloseout(project.id),
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
      rpe: e.rpe ?? null,
      certs: s ? staffCertEvidence(s) : [],
    };
  });

  const office = isOfficeRole(ctx.profile?.app_role);

  // The register only offers the project's assigned team.
  const teamIds = new Set(team.map((s) => s.id));
  const onRegister = new Set(register.map((e) => e.staff_id));
  const available: AvailableStaff[] = team
    .filter((s) => !onRegister.has(s.id))
    .map((s) => {
      const reason = staffBlockReason(s);
      return {
        id: s.id,
        name: s.name,
        roleShort: STAFF_ROLE_SHORT[s.role],
        blocked: Boolean(reason),
        blockReason: reason,
        certs: staffCertEvidence(s),
      };
    });

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
  // Site diary + visitors
  const diaryEntries: DiaryEntry[] = await Promise.all(
    siteLog.map(async (e) => ({
      id: e.id,
      logDate: e.log_date,
      category: e.category,
      note: e.note,
      authorName: e.author_staff_id ? names.get(e.author_staff_id) ?? null : null,
      createdAt: e.created_at,
      attachmentUrl: await signAttachmentUrl(e.attachment_path),
      attachmentType: e.attachment_type,
    }))
  );
  const visitorRows: VisitorRow[] = visitors.map((v) => ({
    id: v.id,
    name: v.name,
    organisation: v.organisation,
    purpose: v.purpose,
    timeIn: v.time_in,
    timeOut: v.time_out,
  }));

  const stillOnSite = register.filter((e) => e.check_in && !e.check_out && !e.blocked).length;
  const shiftState = shift ? { startedAt: shift.started_at, endedAt: shift.ended_at } : null;
  const todayLogged = siteLog.some((e) => e.log_date === today);
  const plantCheckedToday = plant.filter((p) => checkedTodayIds.has(p.id)).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // Office plant assignment: what's on the job vs. the rest of the fleet.
  const toPlantOption = (p: (typeof allPlant)[number]): PlantOption => ({
    id: p.id,
    assetId: p.asset_id,
    label: p.name ?? PLANT_TYPE_LABEL[p.type],
    certExpired: isExpired(p.cert_expiry),
  });
  const assignedPlantIds = new Set(plant.map((p) => p.id));
  const assignedPlantOptions: PlantOption[] = plant.map(toPlantOption);
  const addablePlantOptions: PlantOption[] = allPlant
    .filter((p) => !assignedPlantIds.has(p.id))
    .map(toPlantOption);

  // Office team management: current team + who else can be added.
  const teamMembers: TeamMember[] = team.map((s) => ({
    id: s.id,
    name: s.name,
    roleShort: STAFF_ROLE_SHORT[s.role],
  }));
  const addableStaff: TeamMember[] = staff
    .filter((s) => !teamIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, roleShort: STAFF_ROLE_SHORT[s.role] }));

  const workAreaRows: WorkAreaRow[] = await Promise.all(
    workAreas.map(async (a) => ({
      id: a.id,
      name: a.name,
      location: a.location,
      taskActivity: a.task_activity,
      specialRequirements: a.special_requirements,
      setupChecks: a.setup_checks,
      smokeTest: a.smoke_test,
      notes: a.notes,
      hasPlan: Boolean(a.plan_path),
      planUrl: await signPlanUrl(a.plan_path),
    }))
  );

  const ramsFileUrl = office ? await signAttachmentUrl(project.rams_file_path) : null;

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
        <BackLink href="/projects" label="Back to projects" />
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
          {NOTIFICATION_FORM[project.classification] && (
            <Meta
              label={`${NOTIFICATION_FORM[project.classification]} notified`}
              value={formatDate(project.asb5_notification_date)}
            />
          )}
        </dl>
        {office && (
          <Link
            href={`/projects/${project.id}/edit`}
            className="btn-secondary mt-3 w-full text-sm"
          >
            ✎ Edit project details
          </Link>
        )}
        {project.classification === "licensed" && (
          <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">
            Licensed project — daily start-of-project plant checks (DCU / vacuum /
            NPU) are enforced from Phase D.
          </p>
        )}
      </section>

      {/* On-site workspace — tidy tap-to-open sections. Shift + Register open by
          default (done first on arrival); the rest tucked away to keep the page
          short and easy to navigate one-handed. */}
      <div className="space-y-4">
        <CollapsibleSection
          title="Today's Shift"
          defaultOpen
          summary={shiftState ? (shiftState.endedAt ? "Ended" : "In progress") : "Not started"}
        >
          <ShiftControl projectId={project.id} shift={shiftState} stillOnSite={stillOnSite} />
        </CollapsibleSection>

        {office && (
          <CollapsibleSection title="Site Team" summary={plural(teamMembers.length, "assigned")}>
            <SiteTeam projectId={project.id} team={teamMembers} addable={addableStaff} />
          </CollapsibleSection>
        )}

        {office && (
          <CollapsibleSection
            title="RAMS"
            summary={
              project.rams_file_path
                ? project.rams_summary
                  ? "Uploaded · summarised"
                  : "Uploaded"
                : project.rams_document_url
                  ? "Reference on file"
                  : "None yet"
            }
          >
            <RamsPanel
              projectId={project.id}
              ramsLink={project.rams_document_url}
              ramsFileUrl={ramsFileUrl}
              hasFile={Boolean(project.rams_file_path)}
              summary={project.rams_summary}
              aiEnabled={AI_ENABLED}
            />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Enclosures & Work Areas"
          defaultOpen
          summary={workAreaRows.length ? plural(workAreaRows.length, "enclosure") : "Add one"}
        >
          <WorkAreas projectId={project.id} areas={workAreaRows} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Site Register · Today"
          defaultOpen
          summary={stillOnSite > 0 ? `${stillOnSite} on site` : "No one signed in"}
        >
          <SiteRegister projectId={project.id} rows={rows} available={available} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Plant & Equipment"
          summary={plant.length ? `${plantCheckedToday}/${plant.length} checked today` : "None assigned"}
        >
          {office && (
            <SitePlant
              projectId={project.id}
              assigned={assignedPlantOptions}
              addable={addablePlantOptions}
            />
          )}
          <PlantChecks projectId={project.id} plant={plantRows} gate={gate} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Exposure Log"
          summary={exposureRows.length ? plural(exposureRows.length, "record") : "None yet"}
        >
          <ExposureCapture
            projectId={project.id}
            operatives={operatives}
            records={exposureRows}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Site Diary"
          summary={todayLogged ? plural(diaryEntries.length, "entry").replace("entrys", "entries") : "⚠ No log for today"}
        >
          <SiteDiary
            projectId={project.id}
            entries={diaryEntries}
            staff={staff.map((s) => ({ id: s.id, name: s.name }))}
            todayISO={today}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Visitors"
          summary={visitorRows.length ? plural(visitorRows.length, "logged") : "None logged"}
        >
          <VisitorLog projectId={project.id} visitors={visitorRows} />
        </CollapsibleSection>

        {AI_ENABLED && (
          <RamsDrafter projectId={project.id} reference={project.reference} />
        )}

        {/* One-tap report — renders a branded PDF from whatever's been collected
            so far, at any point in the job (not just at closeout). */}
        <a
          href={`/projects/${project.id}/closeout/pdf`}
          target="_blank"
          rel="noopener"
          className="btn-secondary w-full"
        >
          ⤓ Download report (PDF)
        </a>

        {(() => {
          const awaitingReview =
            Boolean(closeout?.submitted_for_review_at) && project.status !== "completed";
          const label = project.status === "completed"
            ? "View closeout pack"
            : awaitingReview
              ? (office ? "Review handover ▸ submitted" : "Handover submitted — awaiting office")
              : "Project closeout →";
          return (
            <Link
              href={`/projects/${project.id}/closeout`}
              className={`w-full ${awaitingReview ? "btn-secondary border-warn-500/40 bg-warn-50 text-warn-700" : "btn-primary"}`}
            >
              {label}
            </Link>
          );
        })()}
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
