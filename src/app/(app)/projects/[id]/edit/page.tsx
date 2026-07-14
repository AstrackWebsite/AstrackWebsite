import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import {
  getProjectById,
  getClient,
  getStaffByRole,
  getMyContext,
} from "@/lib/data";
import { isOfficeRole } from "@/lib/types";
import { AddProjectForm, type ProjectFormInitial } from "@/components/AddProjectForm";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  if (!project) notFound();

  const [ctx, cms, supervisors, client] = await Promise.all([
    getMyContext(),
    getStaffByRole("contracts_manager"),
    getStaffByRole("site_supervisor"),
    project.client_id ? getClient(project.client_id) : Promise.resolve(null),
  ]);

  // Editing project details is an office job — supervisors go back to the job.
  if (!isOfficeRole(ctx.profile?.app_role)) redirect(`/projects/${project.id}`);

  const initial: ProjectFormInitial = {
    reference: project.reference,
    address: project.address,
    classification: project.classification,
    start_date: project.start_date,
    end_date: project.end_date,
    max_operatives: project.max_operatives,
    contract_value: project.contract_value,
    contracts_manager_id: project.contracts_manager_id,
    supervisor_id: project.supervisor_id,
    asb5_notification_date: project.asb5_notification_date,
    rams_document_url: project.rams_document_url,
    client_name: client?.name ?? "",
    client_contact: client?.contact ?? null,
    client_address: client?.address ?? null,
    client_email: client?.email ?? null,
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href={`/projects/${project.id}`} label="Back to project" />
        <h1 className="text-xl font-bold text-ink">Edit Project</h1>
      </div>

      <AddProjectForm
        cms={cms}
        supervisors={supervisors}
        initial={initial}
        projectId={project.id}
        clientId={project.client_id}
      />
    </>
  );
}
