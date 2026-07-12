import { PageHeader } from "@/components/PageStub";
import { getAllExposure, getProjects, getStaff, staffNameMap } from "@/lib/data";
import { CONTROL_LIMIT_FML } from "@/lib/compliance";
import { ASBESTOS_TYPE_LABEL } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { AI_ENABLED } from "@/lib/ai/client";
import { InsightsPanel } from "@/components/InsightsPanel";
import { exposureInsightAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PersonalMonitoringPage() {
  const [exposure, projects, staff] = await Promise.all([
    getAllExposure(),
    getProjects(),
    getStaff(),
  ]);
  const projectAddr = new Map(projects.map((p) => [p.id, p.address]));
  const names = staffNameMap(staff);

  return (
    <>
      <PageHeader
        title="Personal Monitoring"
        subtitle="Personal exposure data linked to projects (CAR 2012 · retained 40 yrs)"
      />

      <div className="card mb-4 flex items-center justify-between p-4">
        <span className="text-sm text-ink-muted">Control limit</span>
        <span className="text-sm font-semibold text-ink">{CONTROL_LIMIT_FML} f/ml</span>
      </div>

      {AI_ENABLED && exposure.length > 0 && (
        <InsightsPanel
          generate={exposureInsightAction}
          title="Exposure insights"
          blurb="Spot who's trending near the control limit and which tasks drive exposure."
          cta="Analyse exposure data"
        />
      )}

      <div className="space-y-2">
        {exposure.length === 0 && (
          <p className="card p-4 text-sm text-ink-muted">No exposure records yet.</p>
        )}
        {exposure.map((e) => {
          const breach = e.twa_4h >= CONTROL_LIMIT_FML;
          return (
            <div
              key={e.id}
              className={`card p-4 ${breach ? "border-danger-200 bg-danger-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-ink">
                  {names.get(e.staff_id) ?? "Unknown"}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    breach ? "text-danger-600" : "text-ink-muted"
                  }`}
                >
                  {e.twa_4h.toFixed(3)} f/ml · 4h TWA
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {e.task ?? "—"}
                {e.asbestos_type && ` · ${ASBESTOS_TYPE_LABEL[e.asbestos_type].split(" ")[0]}`}
                {` · ${projectAddr.get(e.project_id) ?? ""}`}
                {` · ${formatDate(e.entry_date)}`}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
