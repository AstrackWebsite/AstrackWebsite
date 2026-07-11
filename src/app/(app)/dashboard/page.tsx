import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { KpiTile } from "@/components/KpiTile";
import { getStaff, getProjects, staffNameMap, getMyContext } from "@/lib/data";
import { hasExpiredCert } from "@/lib/compliance";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUS_LABEL, PROJECT_STATUS_PILL } from "@/lib/roles";
import { gbpCompact, formatDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [staff, projects, ctx] = await Promise.all([
    getStaff(),
    getProjects(),
    getMyContext(),
  ]);
  const names = staffNameMap(staff);

  const activeProjects = projects.filter((p) =>
    ACTIVE_PROJECT_STATUSES.includes(p.status)
  );
  const projectValue = activeProjects.reduce(
    (sum, p) => sum + (p.contract_value ?? 0),
    0
  );
  const expiredCertStaff = staff.filter((s) => hasExpiredCert(s));

  return (
    <>
      <PageHeader title="Overview" subtitle={ctx.company?.name ?? undefined} />

      <div className="grid grid-cols-2 gap-3">
        <KpiTile value={staff.length} label="Staff" href="/staff" />
        <KpiTile value={activeProjects.length} label="Projects" href="/projects" />
        <KpiTile value={gbpCompact(projectValue)} label="Project value" tone="value" />
        <KpiTile
          value={expiredCertStaff.length}
          label="Expired certs"
          tone={expiredCertStaff.length > 0 ? "danger" : "default"}
          href="/staff?filter=expired"
        />
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Active projects
        </h2>
        <div className="space-y-2">
          {activeProjects.length === 0 && (
            <p className="card p-4 text-sm text-ink-muted">No active projects.</p>
          )}
          {activeProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card block p-4 active:bg-surface-muted"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-ink">{p.address}</span>
                <span className={`pill ${PROJECT_STATUS_PILL[p.status]}`}>
                  {PROJECT_STATUS_LABEL[p.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {p.reference}
                {p.supervisor_id && ` · Supv: ${names.get(p.supervisor_id) ?? "—"}`}
                {p.start_date && ` · ${formatDay(p.start_date)}`}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
