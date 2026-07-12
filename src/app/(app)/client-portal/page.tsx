import { PageHeader } from "@/components/PageStub";
import { getProjects } from "@/lib/data";
import { ClientPortalManager, type PortalProject } from "@/components/ClientPortalManager";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  const projects = await getProjects();
  const rows: PortalProject[] = projects.map((p) => ({
    id: p.id,
    address: p.address,
    reference: p.reference,
    token: p.portal_token,
    enabled: p.portal_enabled,
  }));

  return (
    <>
      <PageHeader
        title="Client Portal"
        subtitle="Share a read-only status link with each client"
      />
      <p className="mb-4 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">
        Turn a project&apos;s portal on to get a private link. Anyone with the
        link sees a read-only status page (progress + air monitoring) — nothing
        else, and no login. Turn it off any time to revoke access.
      </p>
      <ClientPortalManager projects={rows} />
    </>
  );
}
