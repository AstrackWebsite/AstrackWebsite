import { BackLink } from "@/components/BackLink";
import { getStaff, getProjects, getAllPlant } from "@/lib/data";
import { IncidentForm } from "@/components/IncidentForm";
import { AI_ENABLED } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default async function NewIncidentPage() {
  const [staff, projects, plant] = await Promise.all([
    getStaff(),
    getProjects(),
    getAllPlant(),
  ]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href="/incidents" label="Back to incidents" />
        <h1 className="text-xl font-bold text-ink">Report an incident</h1>
      </div>
      <IncidentForm staff={staff} projects={projects} plant={plant} aiEnabled={AI_ENABLED} />
    </>
  );
}
