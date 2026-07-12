import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { KpiTile } from "@/components/KpiTile";
import { getAudits, getProjects, getStaff, staffNameMap } from "@/lib/data";
import { scoreTone } from "@/lib/auditTemplate";
import { formatDate } from "@/lib/format";
import { AI_ENABLED } from "@/lib/ai/client";
import { InsightsPanel } from "@/components/InsightsPanel";
import { auditInsightAction } from "./actions";

export const dynamic = "force-dynamic";

const TONE_TEXT = {
  ok: "text-ok-700", warn: "text-warn-700", danger: "text-danger-600", neutral: "text-ink-muted",
} as const;

export default async function AuditsPage() {
  const [audits, projects, staff] = await Promise.all([
    getAudits(),
    getProjects(),
    getStaff(),
  ]);
  const projectAddr = new Map(projects.map((p) => [p.id, p.address]));
  const names = staffNameMap(staff);

  const scored = audits.filter((a) => a.score != null);
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length)
      : null;
  const lowScores = audits.filter((a) => (a.score ?? 100) < 70).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <PageHeader title="Audits" />
        <Link href="/audits/new" className="btn-primary px-4 py-2 text-sm">
          + New
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <KpiTile value={audits.length} label="Audits" />
        <KpiTile value={avg == null ? "—" : `${avg}%`} label="Avg score" tone="value" />
        <KpiTile value={lowScores} label="Below 70%" tone={lowScores > 0 ? "danger" : "default"} />
      </div>

      {AI_ENABLED && audits.length > 0 && (
        <InsightsPanel
          generate={auditInsightAction}
          title="Audit & risk insights"
          blurb="Find recurring failings and the categories to focus on across all audits."
          cta="Analyse audit history"
        />
      )}

      <div className="space-y-2">
        {audits.length === 0 && (
          <p className="card p-4 text-sm text-ink-muted">
            No audits yet. Tap “New” to run a site H&amp;S audit.
          </p>
        )}
        {audits.map((a) => {
          const tone = scoreTone(a.score);
          return (
            <Link key={a.id} href={`/audits/${a.id}`} className="card block p-4 active:bg-surface-muted">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-ink">
                  {a.project_id ? projectAddr.get(a.project_id) ?? "Site audit" : "Site audit"}
                </span>
                <span className={`text-lg font-bold ${TONE_TEXT[tone]}`}>
                  {a.score == null ? "—" : `${a.score}%`}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {formatDate(a.audit_date)}
                {a.auditor_staff_id && ` · ${names.get(a.auditor_staff_id) ?? ""}`}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
