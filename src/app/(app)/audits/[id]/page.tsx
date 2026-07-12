import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { getAudit, getProjectById, getStaffMember } from "@/lib/data";
import { scoreTone } from "@/lib/auditTemplate";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const TONE_TEXT = {
  ok: "text-ok-700", warn: "text-warn-700", danger: "text-danger-600", neutral: "text-ink-muted",
} as const;

const RESULT_PILL = {
  pass: "pill-ok", fail: "pill-danger", na: "pill-neutral",
} as const;
const RESULT_LABEL = { pass: "Pass", fail: "Fail", na: "N/A" } as const;

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const audit = await getAudit(params.id);
  if (!audit) notFound();

  const [project, auditor] = await Promise.all([
    audit.project_id ? getProjectById(audit.project_id) : Promise.resolve(null),
    audit.auditor_staff_id ? getStaffMember(audit.auditor_staff_id) : Promise.resolve(null),
  ]);

  // Group responses by category
  const byCategory = new Map<string, typeof audit.responses>();
  for (const r of audit.responses) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  const fails = audit.responses.filter((r) => r.result === "fail");
  const tone = scoreTone(audit.score);

  return (
    <>
      <div className="mb-4 flex items-start gap-2">
        <BackLink href="/audits" label="Back" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-ink">
              {project?.address ?? "Site audit"}
            </h1>
            <span className={`text-2xl font-bold ${TONE_TEXT[tone]}`}>
              {audit.score == null ? "—" : `${audit.score}%`}
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            {formatDate(audit.audit_date)}
            {auditor && ` · ${auditor.name}`}
          </p>
        </div>
      </div>

      {fails.length > 0 && (
        <div className="mb-4 rounded-card border border-danger-200 bg-danger-50 p-4">
          <p className="font-semibold text-danger-700">
            {fails.length} item{fails.length > 1 ? "s" : ""} failed
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-danger-600">
            {fails.map((f, i) => <li key={i}>{f.label}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {[...byCategory.entries()].map(([category, items]) => (
          <section key={category} className="card p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {category}
            </h2>
            <ul className="divide-y divide-surface-border">
              {items.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-ink">{r.label}</span>
                  <span className={`pill ${RESULT_PILL[r.result]} shrink-0`}>
                    {RESULT_LABEL[r.result]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {audit.notes && (
        <section className="card mt-4 p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-ink">{audit.notes}</p>
        </section>
      )}
    </>
  );
}
