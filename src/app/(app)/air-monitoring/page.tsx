import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { getAirMonitoring, getProjects, getStaff, staffNameMap } from "@/lib/data";
import { AIR_MONITORING_TYPE_LABEL } from "@/lib/roles";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AirMonitoringPage() {
  const [results, projects, staff] = await Promise.all([
    getAirMonitoring(),
    getProjects(),
    getStaff(),
  ]);
  const projectAddr = new Map(projects.map((p) => [p.id, p.address]));
  const names = staffNameMap(staff);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageHeader
          title="Air Monitoring"
          subtitle="Independent UKAS-analyst results across all projects"
        />
        <Link href="/air-monitoring/new" className="btn-primary shrink-0 px-4 py-2 text-sm">
          + Log result
        </Link>
      </div>
      <div className="space-y-2">
        {results.length === 0 && (
          <p className="card p-4 text-sm text-ink-muted">No air monitoring recorded.</p>
        )}
        {results.map((r) => {
          const pill =
            r.pass === true ? "pill-ok" : r.pass === false ? "pill-danger" : "pill-warn";
          const label =
            r.pass === true ? "Pass" : r.pass === false ? "Fail" : "Pending";
          return (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-ink">
                  {projectAddr.get(r.project_id) ?? "—"}
                </span>
                <span className={`pill ${pill}`}>{label}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {AIR_MONITORING_TYPE_LABEL[r.type]}
                {r.result_fml != null && ` · ${r.result_fml} f/ml`}
                {r.supervisor_id && ` · ${names.get(r.supervisor_id) ?? ""}`}
                {r.sampled_on && ` · ${formatDate(r.sampled_on)}`}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
