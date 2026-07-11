import { redirect } from "next/navigation";
import { getMyContext, getPlatformOverview } from "@/lib/data";
import { PageHeader } from "@/components/PageStub";
import { KpiTile } from "@/components/KpiTile";
import { CompanyRow } from "@/components/CompanyRow";
import { gbpCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile } = await getMyContext();
  if (!profile?.is_platform_admin) redirect("/dashboard");

  const overview = await getPlatformOverview();
  const pending = overview.filter((o) => o.company.status === "pending");
  const others = overview.filter((o) => o.company.status !== "pending");

  // Platform-wide totals (active companies only for turnover/staff)
  const activeCos = overview.filter((o) => o.company.status === "active");
  const totalStaff = activeCos.reduce((s, o) => s + o.staffCount, 0);
  const totalTurnover = activeCos.reduce((s, o) => s + o.turnover, 0);

  return (
    <>
      <PageHeader
        title="Platform admin"
        subtitle="Every contractor account, at a glance"
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <KpiTile value={activeCos.length} label="Active companies" />
        <KpiTile
          value={pending.length}
          label="Pending approval"
          tone={pending.length > 0 ? "danger" : "default"}
        />
        <KpiTile value={totalStaff} label="Staff (platform)" />
        <KpiTile value={gbpCompact(totalTurnover)} label="Total turnover" tone="value" />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Awaiting approval
          <span className="ml-1 font-normal text-ink-faint">({pending.length})</span>
        </h2>
        <div className="space-y-2">
          {pending.length === 0 && (
            <p className="card p-4 text-sm text-ink-muted">No pending requests.</p>
          )}
          {pending.map((o) => (
            <CompanyRow key={o.company.id} overview={o} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          All companies
          <span className="ml-1 font-normal text-ink-faint">({others.length})</span>
        </h2>
        <div className="space-y-2">
          {others.length === 0 && (
            <p className="card p-4 text-sm text-ink-muted">No companies yet.</p>
          )}
          {others.map((o) => (
            <CompanyRow key={o.company.id} overview={o} />
          ))}
        </div>
      </section>
    </>
  );
}
