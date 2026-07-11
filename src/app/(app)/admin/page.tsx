import { redirect } from "next/navigation";
import { getMyContext, getCompanies } from "@/lib/data";
import { PageHeader } from "@/components/PageStub";
import { CompanyRow } from "@/components/CompanyRow";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { profile } = await getMyContext();
  if (!profile?.is_platform_admin) redirect("/dashboard");

  const companies = await getCompanies();
  const pending = companies.filter((c) => c.status === "pending");
  const others = companies.filter((c) => c.status !== "pending");

  return (
    <>
      <PageHeader
        title="Platform admin"
        subtitle="Approve and manage contractor accounts"
      />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Awaiting approval
          <span className="ml-1 font-normal text-ink-faint">({pending.length})</span>
        </h2>
        <div className="space-y-2">
          {pending.length === 0 && (
            <p className="card p-4 text-sm text-ink-muted">No pending requests.</p>
          )}
          {pending.map((c) => (
            <CompanyRow key={c.id} company={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          All companies
          <span className="ml-1 font-normal text-ink-faint">({others.length})</span>
        </h2>
        <div className="space-y-2">
          {others.map((c) => (
            <CompanyRow key={c.id} company={c} />
          ))}
        </div>
      </section>
    </>
  );
}
