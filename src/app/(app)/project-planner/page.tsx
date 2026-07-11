import Link from "next/link";
import { PageHeader } from "@/components/PageStub";
import { getProjects, getStaff, staffNameMap } from "@/lib/data";
import { PROJECT_STATUS_LABEL } from "@/lib/roles";
import { formatDay } from "@/lib/format";
import type { Project, ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const PX_PER_DAY = 11;
const DAY = 86_400_000;

// Bar colour by status
const STATUS_BAR: Record<ProjectStatus, string> = {
  live: "bg-ok-500",
  setup: "bg-warn-500",
  pending: "bg-navy-400",
  completed: "bg-ink-faint",
};

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY);
}

export default async function ProjectPlannerPage() {
  const [projects, staff] = await Promise.all([getProjects(), getStaff()]);
  const names = staffNameMap(staff);

  const today = new Date();
  const scheduled = projects.filter(
    (p) => p.status !== "completed" && p.start_date
  );
  const unscheduled = projects.filter(
    (p) => p.status !== "completed" && !p.start_date
  );

  // Window: from the Monday on/before the earliest start (or this week),
  // to the later of +10 weeks or the latest end.
  const starts = scheduled.map((p) => new Date(p.start_date!).getTime());
  const ends = scheduled.map((p) =>
    new Date(p.end_date ?? new Date(new Date(p.start_date!).getTime() + 7 * DAY)).getTime()
  );
  const windowStart = startOfWeek(
    new Date(Math.min(today.getTime(), ...(starts.length ? starts : [today.getTime()])))
  );
  const horizon = new Date(today.getTime() + 70 * DAY);
  const windowEnd = new Date(
    Math.max(horizon.getTime(), ...(ends.length ? ends : [horizon.getTime()]))
  );
  const totalDays = Math.max(14, dayDiff(windowEnd, windowStart) + 1);
  const trackWidth = totalDays * PX_PER_DAY;

  // Week axis
  const weeks: Date[] = [];
  for (let d = new Date(windowStart); d <= windowEnd; d.setDate(d.getDate() + 7)) {
    weeks.push(new Date(d));
  }
  const todayLeft = dayDiff(today, windowStart) * PX_PER_DAY;

  // Group by supervisor
  const groups = new Map<string, { name: string; projects: Project[] }>();
  for (const p of scheduled) {
    const key = p.supervisor_id ?? "unassigned";
    if (!groups.has(key)) {
      groups.set(key, {
        name: p.supervisor_id ? names.get(p.supervisor_id) ?? "—" : "Unassigned",
        projects: [],
      });
    }
    groups.get(key)!.projects.push(p);
  }

  const counts = (["live", "setup", "pending"] as ProjectStatus[]).map((s) => ({
    s,
    n: scheduled.filter((p) => p.status === s).length,
  }));

  return (
    <>
      <PageHeader title="Project Planner" subtitle="Forward look across supervisors" />

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-ink-muted">
        {counts.map(({ s, n }) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_BAR[s]}`} />
            {PROJECT_STATUS_LABEL[s]} ({n})
          </span>
        ))}
      </div>

      {scheduled.length === 0 ? (
        <p className="card p-4 text-sm text-ink-muted">No scheduled projects.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <div style={{ width: 128 + trackWidth }}>
            {/* Week axis */}
            <div className="flex border-b border-surface-border">
              <div className="sticky left-0 z-10 w-32 shrink-0 bg-surface px-3 py-2 text-xs font-semibold text-ink-muted">
                Supervisor
              </div>
              <div className="relative" style={{ width: trackWidth }}>
                <div className="flex">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="shrink-0 border-l border-surface-border py-2 pl-1 text-[10px] text-ink-faint"
                      style={{ width: 7 * PX_PER_DAY }}
                    >
                      {formatDay(w.toISOString())}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rows */}
            {[...groups.values()].map((g, gi) => (
              <div key={gi} className="border-b border-surface-border">
                <div className="flex items-stretch">
                  <div className="sticky left-0 z-10 flex w-32 shrink-0 items-center bg-surface px-3 py-2 text-sm font-semibold text-ink">
                    {g.name}
                  </div>
                  <div className="relative py-2" style={{ width: trackWidth }}>
                    {/* today marker */}
                    {todayLeft >= 0 && todayLeft <= trackWidth && (
                      <div
                        className="absolute inset-y-0 w-px bg-accent-500"
                        style={{ left: todayLeft }}
                      />
                    )}
                    <div className="space-y-1">
                      {g.projects
                        .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))
                        .map((p) => {
                          const s = new Date(p.start_date!);
                          const e = new Date(
                            p.end_date ?? new Date(s.getTime() + 7 * DAY)
                          );
                          const left = dayDiff(s, windowStart) * PX_PER_DAY;
                          const width = Math.max(
                            PX_PER_DAY * 3,
                            (dayDiff(e, s) + 1) * PX_PER_DAY
                          );
                          return (
                            <Link
                              key={p.id}
                              href={`/projects/${p.id}`}
                              className={`relative flex h-7 items-center overflow-hidden rounded px-2 text-xs font-medium text-white ${STATUS_BAR[p.status]}`}
                              style={{ marginLeft: Math.max(0, left), width }}
                              title={`${p.reference} · ${p.address}`}
                            >
                              <span className="truncate">{p.reference}</span>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unscheduled.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Unscheduled
          </h2>
          <div className="space-y-2">
            {unscheduled.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card block p-3 text-sm active:bg-surface-muted">
                <span className="font-semibold text-ink">{p.address}</span>
                <span className="text-ink-muted"> · {p.reference} · no dates set</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
