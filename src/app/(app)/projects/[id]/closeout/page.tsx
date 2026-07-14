import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { getProjectById, getCloseout, getCloseoutDocuments, signAttachmentUrl } from "@/lib/data";
import { CloseoutForm } from "@/components/CloseoutForm";
import { CloseoutDocuments, type CloseoutDocRow } from "@/components/CloseoutDocuments";
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

  const docs = await getCloseoutDocuments(project.id);
  const docRows: CloseoutDocRow[] = await Promise.all(
    docs.map(async (d) => ({
      id: d.id,
      docType: d.doc_type,
      title: d.title,
      uploadedAt: d.uploaded_at,
      url: await signAttachmentUrl(d.file_path),
    }))
  );

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

      <div className="mt-4">
        <CloseoutDocuments projectId={project.id} docs={docRows} />
      </div>
    </>
  );
}
