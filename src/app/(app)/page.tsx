import { PageHeader } from "@/components/PageStub";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Overview" subtitle="ART Asbestos" />

      <div className="card p-6">
        <span className="pill pill-ok mb-3">Phase A complete</span>
        <p className="text-sm text-ink-muted">
          Scaffold, authentication, database schema and the app shell are in
          place. KPI tiles (Staff · Projects · Project Value · Expired Certs)
          and the live project list arrive in{" "}
          <span className="font-semibold text-ink">Phase B</span>.
        </p>
      </div>
    </>
  );
}
