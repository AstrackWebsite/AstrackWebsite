import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { KpiTile } from "@/components/KpiTile";
import {
  getStaff,
  getProjects,
  staffNameMap,
  getMyContext,
  getHandoversAwaitingReview,
  getNotifications,
  getUnreadNotificationCount,
} from "@/lib/data";
import { NotificationsFeed, type NotificationRow } from "@/components/NotificationsFeed";
import { hasExpiredCert } from "@/lib/compliance";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUS_LABEL, PROJECT_STATUS_PILL } from "@/lib/roles";
import { isOfficeRole } from "@/lib/types";
import { gbpCompact, formatDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [staff, projects, ctx] = await Promise.all([
    getStaff(),
    getProjects(),
    getMyContext(),
  ]);
  const names = staffNameMap(staff);

  // Office/admin get alerted to handovers a supervisor has submitted and that
  // are still waiting on office sign-off.
  const isOffice = isOfficeRole(ctx.profile?.app_role);
  const awaitingReview = isOffice ? await getHandoversAwaitingReview() : [];

  // Office/admin see a documented feed of what supervisors have logged on site.
  const [notifs, unread] = isOffice
    ? await Promise.all([getNotifications(), getUnreadNotificationCount()])
    : [[], 0];
  const notifRows: NotificationRow[] = notifs.map((n) => ({
    id: n.id,
    projectId: n.project_id,
    actorName: n.actor_name,
    message: n.message,
    createdAt: n.created_at,
    read: Boolean(n.read_at),
  }));

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

      {isOffice && <NotificationsFeed notifications={notifRows} unread={unread} />}

      {awaitingReview.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <span className="pill pill-warn">{awaitingReview.length}</span>
            <h2 className="text-sm font-semibold text-amber-900">
              {awaitingReview.length === 1
                ? "Handover awaiting your sign-off"
                : "Handovers awaiting your sign-off"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Submitted by site and ready for office review.
          </p>
          <div className="mt-3 space-y-2">
            {awaitingReview.map((h) => (
              <Link
                key={h.projectId}
                href={`/projects/${h.projectId}/closeout`}
                className="block rounded-lg bg-white p-3 shadow-sm active:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-ink">{h.address}</span>
                  <span className="whitespace-nowrap text-xs text-ink-muted">
                    {formatDay(h.submittedAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {h.reference} · Review &amp; sign off →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <KpiTile value={staff.length} label="Staff" href="/staff" />
        <KpiTile value={activeProjects.length} label="Projects" href="/projects" />
        {isOffice && (
          <KpiTile value={gbpCompact(projectValue)} label="Project value" tone="value" />
        )}
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
