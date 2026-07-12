import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { getProjectById, getCloseout } from "@/lib/data";
import { CloseoutForm } from "@/components/CloseoutForm";
import { AI_ENABLED } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export default async function CloseoutPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  if (!project) notFound();
  const closeout = await getCloseout(project.id);
  const completed = project.status === "completed" || Boolean(closeout?.completed_at);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <BackLink href={`/projects/${project.id}`} label="Back to project" />
        <div>
          <h1 className="text-xl font-bold text-ink">Closeout</h1>
          <p className="text-sm text-ink-muted">{project.address}</p>
        </div>
      </div>

      <p className="mb-4 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">
        Completing generates one PDF pack — registers, exposure, plant checks,
        air monitoring and clearance — ready to send to the client.
      </p>

      <CloseoutForm
        projectId={project.id}
        closeout={closeout}
        completed={completed}
        aiEnabled={AI_ENABLED}
      />
    </>
  );
}
