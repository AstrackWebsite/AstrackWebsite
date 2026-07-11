import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { getProjects, getStaff, staffNameMap } from "@/lib/data";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_PILL,
  CLASSIFICATION_LABEL,
} from "@/lib/roles";
import { formatDay } from "@/lib/format";
import type { ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: ProjectStatus[] = ["live", "setup", "pending", "completed"];

export default async function ProjectsPage() {
  const [projects, staff] = await Promise.all([getProjects(), getStaff()]);
  const names = staffNameMap(staff);

  const counts = STATUS_ORDER.map((s) => ({
    status: s,
    n: projects.filter((p) => p.status === s).length,
  }));

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageHeader title="Projects" />
        <Link href="/projects/new" className="btn-primary px-4 py-2 text-sm">
          + Add
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-2">
        {counts.map((c) => (
          <div key={c.status} className="card p-3 text-center">
            <div className="text-2xl font-bold text-ink">{c.n}</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {PROJECT_STATUS_LABEL[c.status]}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {projects.length === 0 && (
          <p className="card p-4 text-sm text-ink-muted">No projects yet.</p>
        )}
        {projects.map((p) => (
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
              {p.reference} · {CLASSIFICATION_LABEL[p.classification]}
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">
              {p.contracts_manager_id && `CM: ${names.get(p.contracts_manager_id) ?? "—"}`}
              {p.supervisor_id && ` · Supv: ${names.get(p.supervisor_id) ?? "—"}`}
              {p.start_date && ` · ${formatDay(p.start_date)}`}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
