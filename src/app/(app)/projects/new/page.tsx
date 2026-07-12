import { BackLink } from "@/components/BackLink";
import { getStaffByRole } from "@/lib/data";
import { AddProjectForm } from "@/components/AddProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const [cms, supervisors] = await Promise.all([
    getStaffByRole("contracts_manager"),
    getStaffByRole("site_supervisor"),
  ]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href="/projects" label="Back to projects" />
        <h1 className="text-xl font-bold text-ink">New Project</h1>
      </div>

      <AddProjectForm cms={cms} supervisors={supervisors} />
    </>
  );
}
