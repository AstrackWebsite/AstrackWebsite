import { BackLink } from "@/components/BackLink";
import { getProjects, getStaff } from "@/lib/data";
import { AddAirResultForm } from "@/components/AddAirResultForm";
import { AI_ENABLED } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default async function NewAirResultPage() {
  const [projects, staff] = await Promise.all([getProjects(), getStaff()]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href="/air-monitoring" label="Back to air monitoring" />
        <h1 className="text-xl font-bold text-ink">Log air result</h1>
      </div>

      <AddAirResultForm projects={projects} staff={staff} aiEnabled={AI_ENABLED} />
    </>
  );
}
